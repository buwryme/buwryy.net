use std::collections::HashMap;
use std::fmt;
use std::io::Write;
use std::process::{Command, Stdio};

use serde::Deserialize;
use serde_json::{Value, json};

use crate::model::Post;

pub const DEFAULT_GIST_ID: &str = "e3844adacb4cf4ed14bccb649b4eb688";
pub const BLOG_FILE: &str = "blog.json";

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
    format!("https://gist.github.com/{}", gist_id())
}

pub fn load() -> Result<Snapshot, GistError> {
    let output = run_gh(&["api", &format!("gists/{}", gist_id())], None)?;
    let response: GistResponse = serde_json::from_str(&output).map_err(|error| {
        GistError::with_detail(
            "GitHub returned something Netblog could not read.",
            error.to_string(),
        )
    })?;

    let file = response
        .files
        .get(BLOG_FILE)
        .ok_or_else(|| GistError::new(format!("The gist has no {BLOG_FILE} file.")))?;

    if file.truncated {
        return Err(GistError::new(
            "The gist file is too large for the GitHub API to return in full.",
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

    let output = run_gh(
        &[
            "api",
            "--method",
            "PATCH",
            &format!("gists/{}", gist_id()),
            "--input",
            "-",
        ],
        Some(&body),
    )?;

    let updated_at = serde_json::from_str::<GistResponse>(&output)
        .ok()
        .and_then(|response| response.updated_at);

    Ok(Snapshot {
        posts: posts.to_vec(),
        updated_at,
    })
}

fn run_gh(arguments: &[&str], stdin: Option<&[u8]>) -> Result<String, GistError> {
    let mut command = Command::new("gh");
    command
        .args(arguments)
        .env("GH_PROMPT_DISABLED", "1")
        .env("NO_COLOR", "1")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    if stdin.is_some() {
        command.stdin(Stdio::piped());
    } else {
        command.stdin(Stdio::null());
    }

    let mut child = command.spawn().map_err(|error| {
        if error.kind() == std::io::ErrorKind::NotFound {
            GistError::with_detail(
                "GitHub CLI (gh) is not installed.",
                "Install gh, then run: gh auth login",
            )
        } else {
            GistError::with_detail("Could not start GitHub CLI (gh).", error.to_string())
        }
    })?;

    if let Some(input) = stdin {
        let mut handle = child
            .stdin
            .take()
            .ok_or_else(|| GistError::new("Could not open gh's input stream."))?;
        handle.write_all(input).map_err(|error| {
            GistError::with_detail("Could not send the request to gh.", error.to_string())
        })?;
    }

    let output = child.wait_with_output().map_err(|error| {
        GistError::with_detail("Could not finish the gh request.", error.to_string())
    })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        let hint = if stderr.to_lowercase().contains("auth")
            || stderr.to_lowercase().contains("logged in")
            || stderr.to_lowercase().contains("token")
        {
            Some("Run gh auth login in a terminal, then try again.".to_string())
        } else {
            None
        };
        let message =
            hint.unwrap_or_else(|| "GitHub CLI could not complete the request.".to_string());
        return Err(GistError::with_detail(message, stderr));
    }

    String::from_utf8(output.stdout).map_err(|error| {
        GistError::with_detail(
            "gh returned text that is not valid UTF-8.",
            error.to_string(),
        )
    })
}
