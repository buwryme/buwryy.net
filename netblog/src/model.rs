use std::collections::HashSet;

use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Post {
    pub slug: String,
    pub title: String,
    #[serde(default)]
    pub date: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub summary: Option<String>,
    #[serde(default)]
    pub body: String,
    #[serde(skip)]
    pub slug_auto: bool,
}

impl Post {
    pub fn new() -> Self {
        Self {
            slug: String::new(),
            title: String::new(),
            date: today_string(),
            summary: None,
            body: String::new(),
            slug_auto: true,
        }
    }

    pub fn display_date(&self) -> String {
        self.date_naive()
            .map(|date| date.format("%b %-d, %Y").to_string())
            .unwrap_or_else(|| "No date".to_string())
    }

    pub fn date_naive(&self) -> Option<NaiveDate> {
        if let Ok(value) = DateTime::parse_from_rfc3339(&self.date) {
            return Some(value.date_naive());
        }
        NaiveDate::parse_from_str(self.date.get(..10).unwrap_or(&self.date), "%Y-%m-%d").ok()
    }

    pub fn set_date(&mut self, date: NaiveDate) {
        self.date = format!("{}T12:00:00Z", date.format("%Y-%m-%d"));
    }

    pub fn word_count(&self) -> usize {
        self.body.split_whitespace().count()
    }

    pub fn read_minutes(&self) -> usize {
        self.word_count().div_ceil(220).max(1)
    }

    pub fn excerpt(&self) -> String {
        if let Some(summary) = self
            .summary
            .as_ref()
            .map(|value| value.trim())
            .filter(|value| !value.is_empty())
        {
            return summary.to_string();
        }

        let line = self
            .body
            .lines()
            .map(str::trim)
            .find(|line| !line.is_empty() && !line.starts_with("```"))
            .unwrap_or("");

        let line = line
            .trim_start_matches('#')
            .trim_start_matches('>')
            .trim_start_matches("- ")
            .trim_start_matches("* ")
            .trim_matches('`')
            .trim();

        truncate(line, 110)
    }

    pub fn prepare_for_save(&self) -> Self {
        let mut post = self.clone();
        post.title = post.title.trim().to_string();
        post.slug = post.slug.trim().to_string();
        post.summary = post
            .summary
            .as_ref()
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty());
        post.slug_auto = false;
        post
    }
}

impl Default for Post {
    fn default() -> Self {
        Self::new()
    }
}

pub fn today_string() -> String {
    format!("{}T12:00:00Z", Utc::now().format("%Y-%m-%d"))
}

pub fn slugify(title: &str) -> String {
    let mut slug = String::new();
    let mut pending_dash = false;

    for character in title.chars() {
        if character.is_ascii_alphanumeric() {
            if pending_dash && !slug.is_empty() {
                slug.push('-');
            }
            slug.push(character.to_ascii_lowercase());
            pending_dash = false;
        } else if !slug.is_empty() {
            pending_dash = true;
        }
    }

    slug
}

pub fn slug_is_valid(slug: &str) -> bool {
    !slug.is_empty()
        && !slug.starts_with('-')
        && !slug.ends_with('-')
        && !slug.contains("--")
        && slug.chars().all(|character| {
            character.is_ascii_lowercase() || character.is_ascii_digit() || character == '-'
        })
}

#[derive(Debug, Clone)]
pub struct ValidationError {
    pub post_index: usize,
    pub message: String,
}

pub fn validate(posts: &[Post]) -> Result<(), ValidationError> {
    let mut slugs = HashSet::new();

    for (index, post) in posts.iter().enumerate() {
        let label = if post.title.trim().is_empty() {
            format!("Post {}", index + 1)
        } else {
            format!("\"{}\"", post.title.trim())
        };

        if post.title.trim().is_empty() {
            return Err(error(index, format!("{label} needs a title.")));
        }
        if !slug_is_valid(post.slug.trim()) {
            return Err(error(
                index,
                format!(
                    "{label} needs a URL slug using lowercase letters, numbers and single hyphens."
                ),
            ));
        }
        if !slugs.insert(post.slug.trim().to_string()) {
            return Err(error(
                index,
                format!(
                    "Another post already uses the slug \"{}\".",
                    post.slug.trim()
                ),
            ));
        }
        if post.date_naive().is_none() {
            return Err(error(index, format!("{label} needs a valid date.")));
        }
        if post.body.trim().is_empty() {
            return Err(error(index, format!("{label} needs a body.")));
        }
    }

    Ok(())
}

fn error(post_index: usize, message: String) -> ValidationError {
    ValidationError {
        post_index,
        message,
    }
}

fn truncate(value: &str, maximum: usize) -> String {
    if value.chars().count() <= maximum {
        return value.to_string();
    }
    let mut result: String = value.chars().take(maximum.saturating_sub(3)).collect();
    result.push_str("...");
    result
}
