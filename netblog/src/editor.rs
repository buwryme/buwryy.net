use std::cell::Cell;
use std::rc::Rc;

use chrono::{Datelike, NaiveDate};
use gtk::{gio, glib};
use sourceview5::prelude::*;
use webkit6::prelude::{PolicyDecisionExt, WebViewExt};

use crate::markdown;
use crate::model::Post;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ChangedField {
    Title,
    Slug,
    Summary,
    Body,
    Date,
}

pub struct EditorPane {
    pub root: gtk::Box,
    title: gtk::Entry,
    slug: gtk::Entry,
    summary: gtk::Entry,
    slug_error: gtk::Label,
    date_button: gtk::MenuButton,
    date_label: gtk::Label,
    calendar: gtk::Calendar,
    today_button: gtk::Button,
    date: Rc<Cell<Option<NaiveDate>>>,
    buffer: sourceview5::Buffer,
    preview: webkit6::WebView,
    stack: gtk::Stack,
    word_label: gtk::Label,
    updating: Rc<Cell<bool>>,
}

impl EditorPane {
    pub fn new() -> Self {
        let updating = Rc::new(Cell::new(false));

        let title = gtk::Entry::builder()
            .placeholder_text("Post title")
            .hexpand(true)
            .build();
        title.add_css_class("post-title-entry");
        title.set_max_length(160);

        let slug = gtk::Entry::builder()
            .placeholder_text("post-slug")
            .hexpand(true)
            .build();
        slug.add_css_class("meta-entry");
        slug.set_max_length(120);

        let summary = gtk::Entry::builder()
            .placeholder_text("One line that sells the post (optional)")
            .hexpand(true)
            .build();
        summary.add_css_class("meta-entry");
        summary.set_max_length(240);

        let slug_error = gtk::Label::new(None);
        slug_error.add_css_class("field-error");
        slug_error.set_xalign(0.0);
        slug_error.set_visible(false);

        let date = Rc::new(Cell::new(None::<NaiveDate>));
        let date_label = gtk::Label::new(Some("No date"));
        date_label.add_css_class("date-label");

        let date_box = gtk::Box::new(gtk::Orientation::Horizontal, 8);
        date_box.append(&gtk::Image::from_icon_name("x-office-calendar-symbolic"));
        date_box.append(&date_label);

        let calendar = gtk::Calendar::new();
        calendar.add_css_class("date-calendar");

        let today_button = gtk::Button::with_label("Today");
        today_button.add_css_class("flat");

        let calendar_box = gtk::Box::new(gtk::Orientation::Vertical, 8);
        calendar_box.set_margin_top(10);
        calendar_box.set_margin_bottom(10);
        calendar_box.set_margin_start(10);
        calendar_box.set_margin_end(10);
        calendar_box.append(&calendar);
        calendar_box.append(&today_button);

        let date_popover = gtk::Popover::new();
        date_popover.set_child(Some(&calendar_box));

        let date_button = gtk::MenuButton::new();
        date_button.set_popover(Some(&date_popover));
        date_button.set_child(Some(&date_box));
        date_button.add_css_class("flat");
        date_button.set_tooltip_text(Some("Publication date"));

        let buffer = sourceview5::Buffer::new(None);
        if let Some(language) = sourceview5::LanguageManager::default().language("markdown") {
            buffer.set_language(Some(&language));
        }
        buffer.set_highlight_syntax(true);

        let view = sourceview5::View::with_buffer(&buffer);
        view.set_monospace(true);
        view.set_wrap_mode(gtk::WrapMode::WordChar);
        view.set_left_margin(18);
        view.set_right_margin(18);
        view.set_top_margin(18);
        view.set_bottom_margin(18);
        view.set_auto_indent(true);
        view.set_indent_width(4);
        view.set_insert_spaces_instead_of_tabs(true);
        view.set_highlight_current_line(false);
        view.set_show_line_numbers(true);
        view.add_css_class("body-source");

        let editor_scroller = gtk::ScrolledWindow::builder()
            .hscrollbar_policy(gtk::PolicyType::Never)
            .vexpand(true)
            .hexpand(true)
            .child(&view)
            .build();
        editor_scroller.add_css_class("body-editor");

        let preview = webkit6::WebView::new();
        preview.set_vexpand(true);
        preview.set_hexpand(true);
        preview.add_css_class("preview-frame");
        if let Some(settings) = WebViewExt::settings(&preview) {
            settings.set_enable_javascript(false);
            settings.set_enable_developer_extras(false);
        }
        preview.connect_decide_policy(|_, decision, decision_type| {
            if decision_type != webkit6::PolicyDecisionType::NavigationAction {
                return false;
            }
            let Some(navigation) = decision.downcast_ref::<webkit6::NavigationPolicyDecision>()
            else {
                return false;
            };
            let Some(action) = navigation.navigation_action() else {
                return false;
            };
            if action.navigation_type() != webkit6::NavigationType::LinkClicked {
                return false;
            }
            if let Some(uri) = action.request().and_then(|request| request.uri())
                && (uri.starts_with("http://") || uri.starts_with("https://"))
            {
                let _ = gio::AppInfo::launch_default_for_uri(
                    uri.as_str(),
                    None::<&gio::AppLaunchContext>,
                );
            }
            decision.ignore();
            true
        });

        let preview_box = gtk::Box::new(gtk::Orientation::Vertical, 0);
        preview_box.set_vexpand(true);
        preview_box.set_hexpand(true);
        preview_box.append(&preview);
        preview_box.add_css_class("preview-shell");

        let stack = gtk::Stack::builder()
            .transition_type(gtk::StackTransitionType::Crossfade)
            .transition_duration(160)
            .vexpand(true)
            .hexpand(true)
            .build();
        stack.add_titled(&editor_scroller, Some("write"), "Write");
        stack.add_titled(&preview_box, Some("preview"), "Preview");
        stack.set_visible_child_name("write");

        let switcher = gtk::StackSwitcher::builder()
            .stack(&stack)
            .halign(gtk::Align::End)
            .build();
        switcher.add_css_class("editor-switcher");

        let word_label = gtk::Label::new(Some("0 words"));
        word_label.add_css_class("dim-label");
        word_label.add_css_class("word-count");
        word_label.set_xalign(0.0);

        let body_header = gtk::Box::new(gtk::Orientation::Horizontal, 12);
        let body_title = gtk::Label::new(Some("Body"));
        body_title.add_css_class("field-label");
        body_title.set_xalign(0.0);
        body_header.append(&body_title);
        body_header.append(&word_label);

        let spacer = gtk::Box::new(gtk::Orientation::Horizontal, 0);
        spacer.set_hexpand(true);
        body_header.append(&spacer);
        body_header.append(&switcher);

        let meta_grid = gtk::Grid::builder()
            .row_spacing(10)
            .column_spacing(14)
            .hexpand(true)
            .build();

        meta_grid.attach(&field_label("Slug"), 0, 0, 1, 1);
        meta_grid.attach(&slug, 1, 0, 1, 1);
        meta_grid.attach(&field_label("Date"), 2, 0, 1, 1);
        meta_grid.attach(&date_button, 3, 0, 1, 1);
        meta_grid.attach(&field_label("Summary"), 0, 1, 1, 1);
        meta_grid.attach(&summary, 1, 1, 3, 1);

        let root = gtk::Box::new(gtk::Orientation::Vertical, 16);
        root.add_css_class("editor-pane");
        root.set_margin_top(8);
        root.set_margin_bottom(24);
        root.set_margin_start(28);
        root.set_margin_end(28);
        root.append(&title);
        root.append(&meta_grid);
        root.append(&slug_error);
        root.append(&gtk::Separator::new(gtk::Orientation::Horizontal));
        root.append(&body_header);
        root.append(&stack);

        let editor = Self {
            root,
            title,
            slug,
            summary,
            slug_error,
            date_button,
            date_label,
            calendar,
            today_button,
            date,
            buffer,
            preview,
            stack,
            word_label,
            updating,
        };

        let popover = editor.date_button.popover();
        let date_for_popover = editor.date.clone();
        let calendar_for_popover = editor.calendar.clone();
        let updating_for_popover = editor.updating.clone();
        if let Some(popover) = popover {
            popover.connect_show(move |_| {
                if let Some(current) = date_for_popover.get()
                    && let Ok(datetime) = glib::DateTime::new(
                        &glib::TimeZone::utc(),
                        current.year(),
                        current.month() as i32,
                        current.day() as i32,
                        12,
                        0,
                        0.0,
                    )
                {
                    updating_for_popover.set(true);
                    calendar_for_popover.select_day(&datetime);
                    updating_for_popover.set(false);
                }
            });
        }

        editor
    }

    pub fn connect_changed<F>(&self, callback: F)
    where
        F: Fn(ChangedField) + 'static,
    {
        let callback = Rc::new(callback);

        {
            let callback = callback.clone();
            let updating = self.updating.clone();
            self.title.connect_changed(move |_| {
                if !updating.get() {
                    callback(ChangedField::Title);
                }
            });
        }
        {
            let callback = callback.clone();
            let updating = self.updating.clone();
            self.slug.connect_changed(move |_| {
                if !updating.get() {
                    callback(ChangedField::Slug);
                }
            });
        }
        {
            let callback = callback.clone();
            let updating = self.updating.clone();
            self.summary.connect_changed(move |_| {
                if !updating.get() {
                    callback(ChangedField::Summary);
                }
            });
        }
        {
            let callback = callback.clone();
            let updating = self.updating.clone();
            self.buffer.connect_changed(move |_| {
                if !updating.get() {
                    callback(ChangedField::Body);
                }
            });
        }
        {
            let callback = callback.clone();
            let updating = self.updating.clone();
            let date = self.date.clone();
            let date_label = self.date_label.clone();
            let popover = self.date_button.popover();
            self.calendar.connect_day_selected(move |calendar| {
                if updating.get() {
                    return;
                }
                let datetime = calendar.date();
                let (year, month, day) = datetime.ymd();
                if let Some(value) = NaiveDate::from_ymd_opt(year, month as u32, day as u32) {
                    date.set(Some(value));
                    date_label.set_text(&value.format("%b %-d, %Y").to_string());
                    if let Some(popover) = &popover {
                        popover.popdown();
                    }
                    callback(ChangedField::Date);
                }
            });
        }
        {
            let callback = callback.clone();
            let updating = self.updating.clone();
            let date = self.date.clone();
            let date_label = self.date_label.clone();
            let popover = self.date_button.popover();
            self.today_button.connect_clicked(move |_| {
                if updating.get() {
                    return;
                }
                let today = chrono::Local::now().date_naive();
                date.set(Some(today));
                date_label.set_text(&today.format("%b %-d, %Y").to_string());
                if let Some(popover) = &popover {
                    popover.popdown();
                }
                callback(ChangedField::Date);
            });
        }
    }

    pub fn set_post(&self, post: &Post) {
        self.updating.set(true);
        self.title.set_text(&post.title);
        self.slug.set_text(&post.slug);
        self.summary.set_text(post.summary.as_deref().unwrap_or(""));
        self.buffer.set_text(&post.body);
        let date = post.date_naive();
        self.date.set(date);
        self.date_label.set_text(
            &date
                .map(|value| value.format("%b %-d, %Y").to_string())
                .unwrap_or_else(|| "No date".to_string()),
        );
        self.word_label.set_text(&format!(
            "{} words · {} min read",
            post.word_count(),
            post.read_minutes()
        ));
        self.updating.set(false);
    }

    pub fn title(&self) -> String {
        self.title.text().to_string()
    }

    pub fn slug(&self) -> String {
        self.slug.text().to_string()
    }

    pub fn set_slug(&self, value: &str) {
        self.updating.set(true);
        self.slug.set_text(value);
        self.updating.set(false);
    }

    pub fn summary(&self) -> String {
        self.summary.text().to_string()
    }

    pub fn body(&self) -> String {
        let start = self.buffer.start_iter();
        let end = self.buffer.end_iter();
        self.buffer.text(&start, &end, true).to_string()
    }

    pub fn date(&self) -> Option<NaiveDate> {
        self.date.get()
    }

    pub fn set_word_count(&self, post: &Post) {
        self.word_label.set_text(&format!(
            "{} words · {} min read",
            post.word_count(),
            post.read_minutes()
        ));
    }

    pub fn set_slug_error(&self, message: Option<&str>) {
        self.slug_error.set_text(message.unwrap_or(""));
        self.slug_error.set_visible(message.is_some());
    }

    pub fn set_stack_page(&self, preview: bool) {
        self.stack
            .set_visible_child_name(if preview { "preview" } else { "write" });
    }

    pub fn toggle_preview(&self) {
        let preview = self.stack.visible_child_name().as_deref() != Some("preview");
        self.set_stack_page(preview);
    }

    pub fn is_previewing(&self) -> bool {
        self.stack.visible_child_name().as_deref() == Some("preview")
    }

    pub fn connect_page_changed<F>(&self, callback: F)
    where
        F: Fn() + 'static,
    {
        let callback = Rc::new(callback);
        self.stack.connect_visible_child_notify(move |_| callback());
    }

    pub fn render_preview(&self, dark: bool) {
        let body = self.body();
        let document = markdown::render(&body, dark);
        WebViewExt::load_html(&self.preview, &document, None);
    }

    pub fn focus_title(&self) {
        self.title.grab_focus();
    }
}

fn field_label(text: &str) -> gtk::Label {
    let label = gtk::Label::new(Some(text));
    label.add_css_class("field-label");
    label.set_xalign(0.0);
    label.set_valign(gtk::Align::Center);
    label
}
