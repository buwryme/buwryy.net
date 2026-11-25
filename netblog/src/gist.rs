use std::collections::HashMap;
use std::fmt;
use std::io::Write;
use std::path::PathBuf;
use std::process::{Command, Stdio};

use serde::Deserialize;
use serde_json::{Value, json};

use crate::model::Post;

pub const DEFAULT_GIST_ID: &str = "603ba845a1dc45e4bc53a81d72114ffa";
pub const BLOG_FILE: &str = "blog.json";
const DEFAULT_INSTANCE: &str = "https://gist.buwryy.net";

#[derive(Debug, Clone)]
pub struct Snapshot {
    pub posts: Vec<Post>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone)]
pub struct GistError {
    pub message: String,
    pub detail: Option<String>,
}

impl GistError {
    fn new(message: impl Into<String>) -> Self {
        Self {
            message: message.into(),
            detail: None,
        }
    }

    fn with_detail(message: impl Into<String>, detail: impl Into<String>) -> Self {
        let detail = detail.into();
        let detail = detail.trim();
        Self {
            message: message.into(),
            detail: (!detail.is_empty()).then(|| detail.to_string()),
        }
    }
}

impl fmt::Display for GistError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(formatter, "{}", self.message)
    }
}

impl std::error::Error for GistError {}

#[derive(Deserialize)]
struct GistResponse {
    #[serde(default)]
    updated_at: Option<String>,
    #[serde(default)]
    files: HashMap<String, GistFile>,
}

#[derive(Deserialize)]
struct GistFile {
    #[serde(default)]
    content: Option<String>,
    #[serde(default)]
    truncated: bool,
}

pub fn gist_id() -> String {
    std::env::var("NETBLOG_GIST_ID")
        .ok()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| DEFAULT_GIST_ID.to_string())
}

pub fn gist_url() -> String {
    format!("{}/buwryy/{}", instance_url(), gist_id())
}

fn instance_url() -> String {
    std::env::var("NETBLOG_OPENGIST_URL")
        .ok()
        .map(|value| value.trim().trim_end_matches('/').to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| DEFAULT_INSTANCE.to_string())
}

fn api_url() -> String {
    format!("{}/api/gists/{}", instance_url(), gist_id())
}

fn token() -> Result<String, GistError> {
    if let Ok(value) = std::env::var("NETBLOG_OPENGIST_TOKEN") {
        let value = value.trim().to_string();
        if !value.is_empty() {
            return Ok(value);
        }
    }

    let config_dir = std::env::var("XDG_CONFIG_HOME")
        .map(PathBuf::from)
        .unwrap_or_else(|_| {
            PathBuf::from(std::env::var("HOME").unwrap_or_default()).join(".config")
        });
    let path = config_dir.join("opengist").join("api-token");

    std::fs::read_to_string(&path)
        .ok()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .ok_or_else(|| {
            GistError::with_detail(
                "No Opengist access token was found.",
                format!(
                    "Set NETBLOG_OPENGIST_TOKEN, or save a token in {}.",
                    path.display()
                ),
            )
        })
}

pub fn load() -> Result<Snapshot, GistError> {
    let output = run_curl("GET", &api_url(), None)?;
    let response: GistResponse = serde_json::from_str(&output).map_err(|error| {
        GistError::with_detail(
            "Opengist returned something Netblog could not read.",
            error.to_string(),
        )
    })?;

    let file = response
        .files
        .get(BLOG_FILE)
        .ok_or_else(|| GistError::new(format!("The gist has no {BLOG_FILE} file.")))?;

    if file.truncated {
        return Err(GistError::new(
            "The gist file is too large for the Opengist API to return in full.",
        ));
    }

    let content = file
        .content
        .as_deref()
        .ok_or_else(|| GistError::new(format!("The gist's {BLOG_FILE} file is empty.")))?;

    if content.trim().is_empty() {
        return Ok(Snapshot {
            posts: Vec::new(),
            updated_at: response.updated_at,
        });
    }

    let value: Value = serde_json::from_str(content).map_err(|error| {
        GistError::with_detail("The blog file is not valid JSON.", error.to_string())
    })?;

    let posts = match value {
        Value::Array(entries) => serde_json::from_value::<Vec<Post>>(Value::Array(entries)),
        Value::Object(_) => serde_json::from_value::<Post>(value).map(|post| vec![post]),
        _ => {
            return Err(GistError::new(
                "The blog file must contain an array of posts.",
            ));
        }
    }
    .map_err(|error| {
        GistError::with_detail(
            "A post in the blog file is missing required fields.",
            error.to_string(),
        )
    })?;

    Ok(Snapshot {
        posts,
        updated_at: response.updated_at,
    })
}

pub fn save(posts: &[Post]) -> Result<Snapshot, GistError> {
    let content = serde_json::to_string_pretty(posts).map_err(|error| {
        GistError::with_detail("Could not encode the posts.", error.to_string())
    })?;
    let payload = json!({
        "files": {
            BLOG_FILE: {
                "content": content
            }
        }
    });
    let body = serde_json::to_vec(&payload).map_err(|error| {
        GistError::with_detail("Could not encode the gist request.", error.to_string())
    })?;

    let output = run_curl("PATCH", &api_url(), Some(&body))?;

    let updated_at = serde_json::from_str::<GistResponse>(&output)
        .ok()
        .and_then(|response| response.updated_at);

    Ok(Snapshot {
        posts: posts.to_vec(),
        updated_at,
    })
}

fn run_curl(method: &str, url: &str, stdin: Option<&[u8]>) -> Result<String, GistError> {
    let token = token()?;
    let auth = format!("Authorization: Bearer {token}");

    let mut command = Command::new("curl");
    command
        .args([
            "--silent",
            "--show-error",
            "--fail-with-body",
            "--request",
            method,
            "--header",
            &auth,
            "--header",
            "Content-Type: application/json",
            "--url",
            url,
        ])
        .env("NO_COLOR", "1")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    if stdin.is_some() {
        command
            .args(["--data-binary", "@-"])
            .stdin(Stdio::piped());
    } else {
        command.stdin(Stdio::null());
    }

    let mut child = command.spawn().map_err(|error| {
        if error.kind() == std::io::ErrorKind::NotFound {
            GistError::with_detail(
                "curl is not installed.",
                "Install curl with your package manager, then try again.",
            )
        } else {
            GistError::with_detail("Could not start curl.", error.to_string())
        }
    })?;

    if let Some(input) = stdin {
        let mut handle = child
            .stdin
            .take()
            .ok_or_else(|| GistError::new("Could not open curl's input stream."))?;
        handle.write_all(input).map_err(|error| {
            GistError::with_detail("Could not send the request to curl.", error.to_string())
        })?;
    }

    let output = child.wait_with_output().map_err(|error| {
        GistError::with_detail("Could not finish the curl request.", error.to_string())
    })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        let body = String::from_utf8_lossy(&output.stdout).trim().to_string();
        let detail = if stderr.is_empty() { body } else { stderr };
        let message = if detail.contains("401") || detail.to_lowercase().contains("unauthorized") {
            "Opengist rejected the access token.".to_string()
        } else if detail.contains("403") {
            "The access token cannot write this gist.".to_string()
        } else if detail.contains("404") {
            "The gist was not found on Opengist.".to_string()
        } else {
            "Opengist could not complete the request.".to_string()
        };
        return Err(GistError::with_detail(message, detail));
    }

    String::from_utf8(output.stdout).map_err(|error| {
        GistError::with_detail(
            "curl returned text that is not valid UTF-8.",
            error.to_string(),
        )
    })
}
