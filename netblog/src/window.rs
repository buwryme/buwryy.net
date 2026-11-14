use libadwaita as adw;
use std::cell::{Cell, RefCell};
use std::rc::Rc;
use std::time::Duration;

use adw::prelude::*;
use gtk::{gdk, gio, glib, pango};

use crate::editor::{ChangedField, EditorPane};
use crate::gist::{self, GistError};
use crate::model::{self, Post};

pub struct NetblogWindow {
    pub window: adw::ApplicationWindow,
    split: adw::NavigationSplitView,
    toast_overlay: adw::ToastOverlay,
    list: gtk::ListBox,
    list_stack: gtk::Stack,
    list_empty: adw::StatusPage,
    search: gtk::SearchEntry,
    status_dot: gtk::Label,
    status_label: gtk::Label,
    content_stack: gtk::Stack,
    content_title: adw::WindowTitle,
    back_button: gtk::Button,
    publish_button: gtk::Button,
    publish_icon: gtk::Image,
    publish_label: gtk::Label,
    publish_spinner: gtk::Spinner,
    error_page: adw::StatusPage,
    editor: EditorPane,
    state: RefCell<State>,
    updating: Cell<bool>,
    preview_source: RefCell<Option<glib::SourceId>>,
    sidebar_source: RefCell<Option<glib::SourceId>>,
    close_confirmed: Cell<bool>,
    action_delete: gio::SimpleAction,
    action_move_up: gio::SimpleAction,
    action_move_down: gio::SimpleAction,
    action_publish: gio::SimpleAction,
}

struct State {
    posts: Vec<Post>,
    selected: Option<usize>,
    visible: Vec<usize>,
    search: String,
    dirty: bool,
    loading: bool,
    publishing: bool,
    error: Option<String>,
    revision: Option<String>,
}

impl NetblogWindow {
    pub fn new(application: &adw::Application) -> Rc<Self> {
        let window = adw::ApplicationWindow::builder()
            .application(application)
            .title("Netblog")
            .default_width(1180)
            .default_height(800)
            .build();
        window.set_size_request(720, 560);

        let new_button = gtk::Button::builder()
            .icon_name("list-add-symbolic")
            .tooltip_text("New post (Ctrl+N)")
            .build();
        new_button.add_css_class("flat");

        let reload_button = gtk::Button::builder()
            .icon_name("view-refresh-symbolic")
            .tooltip_text("Reload from the gist (Ctrl+R)")
            .build();
        reload_button.add_css_class("flat");
        reload_button.set_action_name(Some("win.reload"));

        let open_gist_button = gtk::Button::builder()
            .icon_name("external-link-symbolic")
            .tooltip_text("Open the gist in your browser")
            .build();
        open_gist_button.add_css_class("flat");
        open_gist_button.set_action_name(Some("win.open-gist"));

        let sidebar_title = adw::WindowTitle::new("Netblog", "buwryy.net");
        let sidebar_header = adw::HeaderBar::new();
        sidebar_header.pack_start(&new_button);
        sidebar_header.pack_start(&reload_button);
        sidebar_header.pack_start(&open_gist_button);
        sidebar_header.set_title_widget(Some(&sidebar_title));

        let search = gtk::SearchEntry::builder()
            .placeholder_text("Search posts")
            .hexpand(true)
            .build();
        search.add_css_class("sidebar-search");

        let search_box = gtk::Box::new(gtk::Orientation::Vertical, 0);
        search_box.set_margin_top(4);
        search_box.set_margin_bottom(10);
        search_box.set_margin_start(12);
        search_box.set_margin_end(12);
        search_box.append(&search);

        let list = gtk::ListBox::builder()
            .selection_mode(gtk::SelectionMode::Single)
            .activate_on_single_click(true)
            .build();
        list.add_css_class("navigation-sidebar");
        list.add_css_class("post-list");

        let list_scroller = gtk::ScrolledWindow::builder()
            .hscrollbar_policy(gtk::PolicyType::Never)
            .vexpand(true)
            .child(&list)
            .build();

        let list_empty = adw::StatusPage::builder()
            .icon_name("document-new-symbolic")
            .title("No posts yet")
            .description("Write the first one.")
            .build();
        list_empty.add_css_class("sidebar-empty");

        let loading_box = gtk::Box::new(gtk::Orientation::Vertical, 10);
        loading_box.set_valign(gtk::Align::Center);
        loading_box.set_halign(gtk::Align::Center);
        let loading_spinner = gtk::Spinner::new();
        loading_spinner.set_size_request(28, 28);
        loading_spinner.start();
        let loading_label = gtk::Label::new(Some("Reading the gist..."));
        loading_label.add_css_class("dim-label");
        loading_box.append(&loading_spinner);
        loading_box.append(&loading_label);

        let list_stack = gtk::Stack::new();
        list_stack.add_named(&list_scroller, Some("list"));
        list_stack.add_named(&list_empty, Some("empty"));
        list_stack.add_named(&loading_box, Some("loading"));

        let status_dot = gtk::Label::new(Some("●"));
        status_dot.add_css_class("status-dot");
        let status_label = gtk::Label::new(Some("Connecting..."));
        status_label.add_css_class("status-label");
        status_label.set_xalign(0.0);
        status_label.set_ellipsize(pango::EllipsizeMode::End);
        status_label.set_hexpand(true);
        let status_box = gtk::Box::new(gtk::Orientation::Horizontal, 8);
        status_box.set_margin_top(8);
        status_box.set_margin_bottom(10);
        status_box.set_margin_start(14);
        status_box.set_margin_end(14);
        status_box.append(&status_dot);
        status_box.append(&status_label);
        status_box.add_css_class("sidebar-footer");

        let sidebar_toolbar = adw::ToolbarView::new();
        sidebar_toolbar.add_top_bar(&sidebar_header);
        sidebar_toolbar.add_top_bar(&search_box);
        sidebar_toolbar.set_content(Some(&list_stack));
        sidebar_toolbar.add_bottom_bar(&status_box);

        let back_button = gtk::Button::from_icon_name("go-previous-symbolic");
        back_button.add_css_class("flat");
        back_button.set_tooltip_text(Some("Back to posts"));
        back_button.set_visible(false);

        let content_title = adw::WindowTitle::new("Netblog", "buwryy.net");

        let publish_icon = gtk::Image::from_icon_name("cloud-upload-symbolic");
        let publish_label = gtk::Label::new(Some("Publish"));
        let publish_spinner = gtk::Spinner::new();
        publish_spinner.set_visible(false);
        publish_spinner.set_size_request(16, 16);

        let publish_box = gtk::Box::new(gtk::Orientation::Horizontal, 6);
        publish_box.append(&publish_icon);
        publish_box.append(&publish_label);
        publish_box.append(&publish_spinner);

        let publish_button = gtk::Button::new();
        publish_button.set_child(Some(&publish_box));
        publish_button.add_css_class("suggested-action");
        publish_button.add_css_class("publish-button");
        publish_button.set_tooltip_text(Some("Publish to the gist (Ctrl+S)"));
        publish_button.set_action_name(Some("win.publish"));
        publish_button.set_sensitive(false);

        let move_up_button = gtk::Button::builder()
            .icon_name("go-up-symbolic")
            .tooltip_text("Move post up (Alt+Up)")
            .build();
        move_up_button.add_css_class("flat");
        move_up_button.set_action_name(Some("win.move-up"));

        let move_down_button = gtk::Button::builder()
            .icon_name("go-down-symbolic")
            .tooltip_text("Move post down (Alt+Down)")
            .build();
        move_down_button.add_css_class("flat");
        move_down_button.set_action_name(Some("win.move-down"));

        let delete_button = gtk::Button::builder()
            .icon_name("user-trash-symbolic")
            .tooltip_text("Delete this post")
            .build();
        delete_button.add_css_class("flat");
        delete_button.add_css_class("delete-post-button");
        delete_button.set_action_name(Some("win.delete"));

        let post_actions = gtk::Box::new(gtk::Orientation::Horizontal, 0);
        post_actions.add_css_class("linked");
        post_actions.add_css_class("post-actions");
        post_actions.append(&move_up_button);
        post_actions.append(&move_down_button);
        post_actions.append(&delete_button);

        let about_button = gtk::Button::new();
        let about_icon = gtk::Image::from_icon_name("net.buwryy.Netblog");
        about_icon.set_pixel_size(18);
        about_button.set_child(Some(&about_icon));
        about_button.add_css_class("flat");
        about_button.add_css_class("about-button");
        about_button.set_tooltip_text(Some("About Netblog"));
        about_button.set_action_name(Some("win.about"));

        let content_header = adw::HeaderBar::new();
        content_header.pack_start(&back_button);
        content_header.set_title_widget(Some(&content_title));
        content_header.pack_end(&about_button);
        content_header.pack_end(&publish_button);
        content_header.pack_end(&post_actions);

        let editor = EditorPane::new();

        let clamp = adw::Clamp::builder()
            .maximum_size(980)
            .tightening_threshold(700)
            .child(&editor.root)
            .vexpand(true)
            .hexpand(true)
            .margin_top(6)
            .margin_bottom(18)
            .build();

        let loading_page = adw::StatusPage::builder()
            .icon_name("cloud-download-symbolic")
            .title("Connecting to your gist")
            .description("Netblog is using the GitHub CLI credentials from this machine.")
            .build();
        let loading_page_spinner = gtk::Spinner::new();
        loading_page_spinner.set_size_request(32, 32);
        loading_page_spinner.start();
        loading_page.set_child(Some(&loading_page_spinner));

        let error_retry = gtk::Button::with_label("Try Again");
        error_retry.add_css_class("suggested-action");
        error_retry.set_halign(gtk::Align::Center);
        error_retry.set_size_request(160, -1);
        let error_page = adw::StatusPage::builder()
            .icon_name("network-error-symbolic")
            .title("Could not reach the gist")
            .description("GitHub CLI could not load the blog.")
            .child(&error_retry)
            .build();

        let empty_new = gtk::Button::with_label("New Post");
        empty_new.add_css_class("suggested-action");
        empty_new.set_halign(gtk::Align::Center);
        empty_new.set_size_request(160, -1);
        let empty_page = adw::StatusPage::builder()
            .icon_name("document-edit-symbolic")
            .title("Your blog starts here")
            .description("Create a post, then publish it when you are ready.")
            .child(&empty_new)
            .build();

        let content_stack = gtk::Stack::builder()
            .transition_type(gtk::StackTransitionType::Crossfade)
            .transition_duration(160)
            .vexpand(true)
            .hexpand(true)
            .build();
        content_stack.add_named(&loading_page, Some("loading"));
        content_stack.add_named(&error_page, Some("error"));
        content_stack.add_named(&empty_page, Some("empty"));
        content_stack.add_named(&clamp, Some("editor"));
        content_stack.set_visible_child_name("loading");

        let content_toolbar = adw::ToolbarView::new();
        content_toolbar.add_top_bar(&content_header);
        content_toolbar.set_content(Some(&content_stack));

        let sidebar_page = adw::NavigationPage::new(&sidebar_toolbar, "Netblog");
        let content_page = adw::NavigationPage::new(&content_toolbar, "Netblog");

        let split = adw::NavigationSplitView::new();
        split.set_min_sidebar_width(280.0);
        split.set_max_sidebar_width(370.0);
        split.set_sidebar(Some(&sidebar_page));
        split.set_content(Some(&content_page));
        split.set_show_content(true);

        let toast_overlay = adw::ToastOverlay::new();
        toast_overlay.set_child(Some(&split));
        window.set_content(Some(&toast_overlay));

        let action_delete = gio::SimpleAction::new("delete", None);
        let action_move_up = gio::SimpleAction::new("move-up", None);
        let action_move_down = gio::SimpleAction::new("move-down", None);
        let action_publish = gio::SimpleAction::new("publish", None);

        let this = Rc::new(Self {
            window,
            split,
            toast_overlay,
            list,
            list_stack,
            list_empty,
            search,
            status_dot,
            status_label,
            content_stack,
            content_title,
            back_button,
            publish_button,
            publish_icon,
            publish_label,
            publish_spinner,
            error_page,
            editor,
            state: RefCell::new(State {
                posts: Vec::new(),
                selected: None,
                visible: Vec::new(),
                search: String::new(),
                dirty: false,
                loading: true,
                publishing: false,
                error: None,
                revision: None,
            }),
            updating: Cell::new(false),
            preview_source: RefCell::new(None),
            sidebar_source: RefCell::new(None),
            close_confirmed: Cell::new(false),
            action_delete,
            action_move_up,
            action_move_down,
            action_publish,
        });

        this.connect_events(&new_button, &error_retry, &empty_new);
        this.update_status();
        this.update_actions();
        this.load();
        this
    }

    pub fn present(&self) {
        self.window.present();
        self.search.grab_focus();
    }

    fn connect_events(
        self: &Rc<Self>,
        new_button: &gtk::Button,
        error_retry: &gtk::Button,
        empty_new: &gtk::Button,
    ) {
        let this = self.clone();
        new_button.connect_clicked(move |_| this.new_post());

        let this = self.clone();
        empty_new.connect_clicked(move |_| this.new_post());

        let this = self.clone();
        error_retry.connect_clicked(move |_| this.load());

        let this = self.clone();
        self.list.connect_row_selected(move |_, row| {
            if this.updating.get() {
                return;
            }
            let Some(row) = row else {
                return;
            };
            let visible_index = row.index().max(0) as usize;
            let index = this.state.borrow().visible.get(visible_index).copied();
            if let Some(index) = index {
                this.select_post(Some(index));
                if this.split.is_collapsed() {
                    this.split.set_show_content(true);
                }
            }
        });

        let this = self.clone();
        self.search.connect_search_changed(move |entry| {
            let text = entry.text().to_string();
            this.state.borrow_mut().search = text.clone();
            this.rebuild_sidebar();

            if !text.trim().is_empty() {
                let (selected, visible) = {
                    let state = this.state.borrow();
                    (state.selected, state.visible.clone())
                };
                let selection_hidden = selected
                    .map(|selected| !visible.contains(&selected))
                    .unwrap_or(true);
                if selection_hidden && let Some(first) = visible.first().copied() {
                    this.state.borrow_mut().selected = Some(first);
                    this.rebuild_sidebar();
                    this.select_post(Some(first));
                }
            }
        });

        let this = self.clone();
        self.back_button
            .connect_clicked(move |_| this.split.set_show_content(false));

        let this = self.clone();
        self.editor
            .connect_changed(move |field| this.on_editor_changed(field));

        let this = self.clone();
        self.editor.connect_page_changed(move || {
            if this.editor.is_previewing() {
                this.editor
                    .render_preview(adw::StyleManager::default().is_dark());
            }
        });

        let this = self.clone();
        adw::StyleManager::default().connect_dark_notify(move |manager| {
            this.editor.render_preview(manager.is_dark());
        });

        let this = self.clone();
        self.split
            .connect_notify_local(Some("collapsed"), move |split, _| {
                this.back_button.set_visible(split.is_collapsed());
            });

        let this = self.clone();
        self.window.connect_close_request(move |window| {
            if this.close_confirmed.get() {
                return glib::Propagation::Proceed;
            }
            if this.state.borrow().publishing {
                this.show_toast("Wait for the publish to finish first.");
                return glib::Propagation::Stop;
            }
            if !this.state.borrow().dirty {
                return glib::Propagation::Proceed;
            }

            let dialog = adw::AlertDialog::builder()
                .heading("Discard unpublished changes?")
                .body("Your edits live only in this window until you publish. Closing now throws them away.")
                .build();
            dialog.add_response("cancel", "Keep Editing");
            dialog.add_response("discard", "Discard");
            dialog.set_response_appearance("discard", adw::ResponseAppearance::Destructive);
            dialog.set_default_response(Some("cancel"));
            dialog.set_close_response("cancel");

            let this = this.clone();
            let window_for_close = window.clone();
            dialog.connect_response(None, move |dialog: &adw::AlertDialog, response: &str| {
                if response == "discard" {
                    this.close_confirmed.set(true);
                    window_for_close.close();
                }
                dialog.close();
            });
            dialog.present(Some(window));
            glib::Propagation::Stop
        });

        let drop_target = gtk::DropTarget::new(glib::Type::I32, gdk::DragAction::MOVE);
        let this = self.clone();
        drop_target.connect_drop(move |_, value, _, y| {
            let Some(source) = value.get::<i32>().ok().map(|value| value.max(0) as usize) else {
                return false;
            };
            let target = this
                .list
                .row_at_y(y as i32)
                .and_then(|row| {
                    let visible_index = row.index().max(0) as usize;
                    this.state.borrow().visible.get(visible_index).copied()
                })
                .unwrap_or_else(|| this.state.borrow().posts.len());
            this.move_post_to(source, target);
            true
        });
        self.list.add_controller(drop_target);

        self.install_actions();
    }

    fn install_actions(self: &Rc<Self>) {
        let new_action = gio::SimpleAction::new("new", None);
        let this = self.clone();
        new_action.connect_activate(move |_, _| this.new_post());
        self.window.add_action(&new_action);

        let reload_action = gio::SimpleAction::new("reload", None);
        let this = self.clone();
        reload_action.connect_activate(move |_, _| this.reload_requested());
        self.window.add_action(&reload_action);

        let search_action = gio::SimpleAction::new("search", None);
        let this = self.clone();
        search_action.connect_activate(move |_, _| {
            this.search.grab_focus();
        });
        self.window.add_action(&search_action);

        let preview_action = gio::SimpleAction::new("preview", None);
        let this = self.clone();
        preview_action.connect_activate(move |_, _| {
            this.editor.toggle_preview();
            if this.editor.is_previewing() {
                this.editor
                    .render_preview(adw::StyleManager::default().is_dark());
            }
        });
        self.window.add_action(&preview_action);

        let open_gist_action = gio::SimpleAction::new("open-gist", None);
        open_gist_action.connect_activate(|_, _| {
            let _ = gio::AppInfo::launch_default_for_uri(
                &gist::gist_url(),
                None::<&gio::AppLaunchContext>,
            );
        });
        self.window.add_action(&open_gist_action);

        let about_action = gio::SimpleAction::new("about", None);
        let this = self.clone();
        about_action.connect_activate(move |_, _| this.show_about());
        self.window.add_action(&about_action);

        let this = self.clone();
        self.action_publish
            .connect_activate(move |_, _| this.publish());
        self.window.add_action(&self.action_publish);

        let this = self.clone();
        self.action_delete
            .connect_activate(move |_, _| this.delete_selected());
        self.window.add_action(&self.action_delete);

        let this = self.clone();
        self.action_move_up
            .connect_activate(move |_, _| this.move_selected(-1));
        self.window.add_action(&self.action_move_up);

        let this = self.clone();
        self.action_move_down
            .connect_activate(move |_, _| this.move_selected(1));
        self.window.add_action(&self.action_move_down);
    }

    fn load(self: &Rc<Self>) {
        {
            let mut state = self.state.borrow_mut();
            state.loading = true;
            state.publishing = false;
            state.dirty = false;
            state.error = None;
        }
        self.list_stack.set_visible_child_name("loading");
        self.content_stack.set_visible_child_name("loading");
        self.update_status();
        self.update_actions();

        let this = self.clone();
        spawn_async(gist::load, move |result| this.finish_load(result));
    }

    fn finish_load(self: &Rc<Self>, result: Result<gist::Snapshot, GistError>) {
        match result {
            Ok(snapshot) => {
                let has_posts = !snapshot.posts.is_empty();
                {
                    let mut state = self.state.borrow_mut();
                    state.posts = snapshot.posts;
                    state.revision = snapshot.updated_at;
                    state.loading = false;
                    state.dirty = false;
                    state.error = None;
                    state.selected = has_posts.then_some(0);
                }
                self.rebuild_sidebar();
                if has_posts {
                    self.select_post(Some(0));
                } else {
                    self.content_stack.set_visible_child_name("empty");
                    self.content_title.set_title("Netblog");
                    self.content_title.set_subtitle("buwryy.net");
                }
                self.update_status();
                self.update_actions();
            }
            Err(error) => {
                {
                    let mut state = self.state.borrow_mut();
                    state.loading = false;
                    state.error = Some(error.message.clone());
                }
                let description = match error.detail.as_deref() {
                    Some(detail) if !detail.is_empty() => {
                        format!("{}\n\n{}", error.message, detail)
                    }
                    _ => error.message.clone(),
                };
                self.error_page.set_description(Some(&description));
                self.content_stack.set_visible_child_name("error");
                self.list_stack.set_visible_child_name("empty");
                self.list_empty.set_title("Gist unavailable");
                self.list_empty
                    .set_description(Some("Check gh auth and retry."));
                self.update_status();
                self.update_actions();
            }
        }
    }

    fn reload_requested(self: &Rc<Self>) {
        if self.state.borrow().publishing {
            self.show_toast("A publish is already in progress.");
            return;
        }
        if !self.state.borrow().dirty {
            self.load();
            return;
        }

        let dialog = adw::AlertDialog::builder()
            .heading("Reload from the gist?")
            .body("Unpublished edits in this window will be discarded.")
            .build();
        dialog.add_response("cancel", "Cancel");
        dialog.add_response("reload", "Reload");
        dialog.set_response_appearance("reload", adw::ResponseAppearance::Destructive);
        dialog.set_default_response(Some("cancel"));
        dialog.set_close_response("cancel");
        let this = self.clone();
        dialog.connect_response(None, move |dialog: &adw::AlertDialog, response: &str| {
            if response == "reload" {
                this.load();
            }
            dialog.close();
        });
        dialog.present(Some(&self.window));
    }

    fn select_post(self: &Rc<Self>, index: Option<usize>) {
        let post = {
            let mut state = self.state.borrow_mut();
            state.selected = index;
            index.and_then(|index| state.posts.get(index).cloned())
        };

        if let Some(post) = post {
            self.editor.set_post(&post);
            self.content_stack.set_visible_child_name("editor");
            self.content_title.set_title("Netblog");
            self.content_title.set_subtitle(post.title.trim());
            if self.editor.is_previewing() {
                self.editor
                    .render_preview(adw::StyleManager::default().is_dark());
            }
            self.refresh_slug_error();
        } else {
            self.content_stack.set_visible_child_name("empty");
            self.content_title.set_title("Netblog");
            self.content_title.set_subtitle("buwryy.net");
        }
        self.update_actions();
    }

    fn new_post(self: &Rc<Self>) {
        if self.state.borrow().loading || self.state.borrow().publishing {
            return;
        }
        if !self.search.text().is_empty() {
            self.search.set_text("");
        }

        let post = Post::new();
        let index = {
            let mut state = self.state.borrow_mut();
            state.posts.push(post);
            state.dirty = true;
            state.selected = Some(state.posts.len() - 1);
            state.posts.len() - 1
        };
        self.rebuild_sidebar();
        self.select_post(Some(index));
        if self.split.is_collapsed() {
            self.split.set_show_content(true);
        }
        self.editor.focus_title();
        self.update_status();
        self.update_actions();
        self.schedule_preview();
    }

    fn delete_selected(self: &Rc<Self>) {
        let Some(index) = self.state.borrow().selected else {
            return;
        };
        let post = self.state.borrow().posts.get(index).cloned();
        let Some(post) = post else {
            return;
        };
        let title = if post.title.trim().is_empty() {
            "this post".to_string()
        } else {
            format!("\"{}\"", post.title.trim())
        };

        let dialog = adw::AlertDialog::builder()
            .heading(format!("Delete {title}?"))
            .body("It disappears from the gist when you publish. You can undo before then.")
            .build();
        dialog.add_response("cancel", "Cancel");
        dialog.add_response("delete", "Delete");
        dialog.set_response_appearance("delete", adw::ResponseAppearance::Destructive);
        dialog.set_default_response(Some("cancel"));
        dialog.set_close_response("cancel");

        let this = self.clone();
        dialog.connect_response(None, move |dialog: &adw::AlertDialog, response: &str| {
            if response == "delete" {
                this.delete_post_at(index);
            }
            dialog.close();
        });
        dialog.present(Some(&self.window));
    }

    fn delete_post_at(self: &Rc<Self>, index: usize) {
        let removed = {
            let mut state = self.state.borrow_mut();
            if index >= state.posts.len() {
                return;
            }
            let post = state.posts.remove(index);
            state.dirty = true;
            state.selected = if state.posts.is_empty() {
                None
            } else {
                Some(index.min(state.posts.len() - 1))
            };
            post
        };

        self.rebuild_sidebar();
        let next = self.state.borrow().selected;
        self.select_post(next);
        self.update_status();
        self.update_actions();
        self.editor.set_slug_error(None);

        let this = self.clone();
        let toast = adw::Toast::new("Post deleted");
        toast.set_button_label(Some("Undo"));
        toast.connect_button_clicked(move |_| {
            let mut state = this.state.borrow_mut();
            let insert = index.min(state.posts.len());
            state.posts.insert(insert, removed.clone());
            state.selected = Some(insert);
            state.dirty = true;
            drop(state);
            this.rebuild_sidebar();
            this.select_post(Some(insert));
            this.update_status();
            this.update_actions();
        });
        self.toast_overlay.add_toast(toast);
    }

    fn move_selected(self: &Rc<Self>, direction: i32) {
        let Some(index) = self.state.borrow().selected else {
            return;
        };
        let target = index as i32 + direction;
        if target < 0 {
            return;
        }
        self.move_post_to(index, target as usize);
    }

    fn move_post_to(self: &Rc<Self>, source: usize, target: usize) {
        let mut state = self.state.borrow_mut();
        if source >= state.posts.len() {
            return;
        }
        let post = state.posts.remove(source);
        let insert = target.min(state.posts.len());
        state.posts.insert(insert, post);
        state.selected = Some(insert);
        state.dirty = true;
        drop(state);
        self.rebuild_sidebar();
        self.update_status();
        self.update_actions();
    }

    fn on_editor_changed(self: &Rc<Self>, field: ChangedField) {
        if self.updating.get() {
            return;
        }
        let selected = self.state.borrow().selected;
        let Some(index) = selected else {
            return;
        };

        let title = self.editor.title();
        let slug = self.editor.slug();
        let summary = self.editor.summary();
        let body = self.editor.body();
        let date = self.editor.date();

        let updated_post = {
            let mut state = self.state.borrow_mut();
            let Some(post) = state.posts.get_mut(index) else {
                return;
            };

            let updated_post = {
                match field {
                    ChangedField::Title => {
                        post.title = title;
                        if post.slug_auto {
                            let generated = model::slugify(&post.title);
                            post.slug = generated.clone();
                            self.editor.set_slug(&generated);
                        }
                    }
                    ChangedField::Slug => {
                        post.slug = slug;
                        post.slug_auto = false;
                    }
                    ChangedField::Summary => {
                        post.summary = (!summary.trim().is_empty()).then_some(summary);
                    }
                    ChangedField::Body => {
                        post.body = body;
                    }
                    ChangedField::Date => {
                        if let Some(date) = date {
                            post.set_date(date);
                        }
                    }
                }
                post.clone()
            };

            state.dirty = true;
            updated_post
        };
        self.editor.set_word_count(&updated_post);
        self.content_title.set_subtitle(updated_post.title.trim());

        self.refresh_slug_error();
        self.schedule_sidebar_refresh();
        self.schedule_preview();
        self.update_status();
        self.update_actions();
    }

    fn refresh_slug_error(&self) {
        let state = self.state.borrow();
        let Some(index) = state.selected else {
            self.editor.set_slug_error(None);
            return;
        };
        let slug = self.editor.slug();
        if slug.is_empty() {
            let title_empty = state
                .posts
                .get(index)
                .map(|post| post.title.trim().is_empty())
                .unwrap_or(true);
            self.editor.set_slug_error(if title_empty {
                None
            } else {
                Some("Add a URL slug.")
            });
            return;
        }
        if !model::slug_is_valid(&slug) {
            self.editor
                .set_slug_error(Some("Use lowercase letters, numbers and single hyphens."));
            return;
        }
        if state
            .posts
            .iter()
            .enumerate()
            .any(|(other, post)| other != index && post.slug == slug)
        {
            self.editor
                .set_slug_error(Some("Another post already uses this slug."));
            return;
        }
        self.editor.set_slug_error(None);
    }

    fn schedule_sidebar_refresh(self: &Rc<Self>) {
        if let Some(source) = self.sidebar_source.borrow_mut().take() {
            source.remove();
        }
        let this = self.clone();
        let source = glib::timeout_add_local_once(Duration::from_millis(180), move || {
            *this.sidebar_source.borrow_mut() = None;
            this.rebuild_sidebar();
        });
        *self.sidebar_source.borrow_mut() = Some(source);
    }

    fn schedule_preview(self: &Rc<Self>) {
        if let Some(source) = self.preview_source.borrow_mut().take() {
            source.remove();
        }
        let this = self.clone();
        let source = glib::timeout_add_local_once(Duration::from_millis(220), move || {
            *this.preview_source.borrow_mut() = None;
            this.editor
                .render_preview(adw::StyleManager::default().is_dark());
        });
        *self.preview_source.borrow_mut() = Some(source);
    }

    fn rebuild_sidebar(self: &Rc<Self>) {
        let (visible, posts, selected, query, loading) = {
            let state = self.state.borrow();
            let query = state.search.trim().to_lowercase();
            let visible: Vec<usize> = state
                .posts
                .iter()
                .enumerate()
                .filter(|(_, post)| {
                    query.is_empty()
                        || post.title.to_lowercase().contains(&query)
                        || post.slug.to_lowercase().contains(&query)
                        || post
                            .summary
                            .as_deref()
                            .unwrap_or("")
                            .to_lowercase()
                            .contains(&query)
                })
                .map(|(index, _)| index)
                .collect();
            (
                visible,
                state.posts.clone(),
                state.selected,
                query,
                state.loading,
            )
        };

        self.state.borrow_mut().visible = visible.clone();

        self.updating.set(true);
        while let Some(child) = self.list.first_child() {
            self.list.remove(&child);
        }

        if loading {
            self.list_stack.set_visible_child_name("loading");
            self.updating.set(false);
            return;
        }

        if visible.is_empty() {
            if posts.is_empty() {
                self.list_empty.set_title("No posts yet");
                self.list_empty
                    .set_description(Some("Write the first one."));
            } else {
                self.list_empty.set_title("No matches");
                self.list_empty
                    .set_description(Some("Try a different search."));
            }
            self.list_stack.set_visible_child_name("empty");
            self.list.select_row(None::<&gtk::ListBoxRow>);
            self.updating.set(false);
            return;
        }

        self.list_stack.set_visible_child_name("list");

        for index in &visible {
            let Some(post) = posts.get(*index) else {
                continue;
            };
            let row = self.create_post_row(*index, post, query.is_empty());
            self.list.append(&row);
        }

        if let Some(selected_index) = selected {
            if let Some(position) = visible.iter().position(|index| *index == selected_index) {
                if let Some(row) = self.list.row_at_index(position as i32) {
                    self.list.select_row(Some(&row));
                }
            } else {
                self.list.select_row(None::<&gtk::ListBoxRow>);
            }
        } else {
            self.list.select_row(None::<&gtk::ListBoxRow>);
        }
        self.updating.set(false);
    }

    fn create_post_row(
        self: &Rc<Self>,
        index: usize,
        post: &Post,
        can_drag: bool,
    ) -> gtk::ListBoxRow {
        let row = gtk::ListBoxRow::new();
        row.add_css_class("post-row");

        let content = gtk::Box::new(gtk::Orientation::Horizontal, 10);
        content.set_margin_top(8);
        content.set_margin_bottom(8);
        content.set_margin_start(8);
        content.set_margin_end(10);

        let handle = gtk::Image::from_icon_name("list-drag-handle-symbolic");
        handle.add_css_class("drag-handle");
        handle.set_tooltip_text(Some("Drag to reorder"));
        handle.set_visible(can_drag);
        handle.set_cursor_from_name(Some("grab"));

        if can_drag {
            let source = gtk::DragSource::new();
            source.set_actions(gdk::DragAction::MOVE);
            let index = index as i32;
            source.connect_prepare(move |_, _, _| {
                Some(gdk::ContentProvider::for_value(&index.to_value()))
            });
            handle.add_controller(source);
        }

        let labels = gtk::Box::new(gtk::Orientation::Vertical, 2);
        labels.set_hexpand(true);

        let title = gtk::Label::new(Some(if post.title.trim().is_empty() {
            "Untitled post"
        } else {
            post.title.trim()
        }));
        title.add_css_class("post-row-title");
        title.set_xalign(0.0);
        title.set_ellipsize(pango::EllipsizeMode::End);

        let subtitle = gtk::Label::new(Some(&format!(
            "{}  ·  {}",
            post.display_date(),
            post.excerpt()
        )));
        subtitle.add_css_class("post-row-sub");
        subtitle.set_xalign(0.0);
        subtitle.set_ellipsize(pango::EllipsizeMode::End);

        labels.append(&title);
        labels.append(&subtitle);
        content.append(&handle);
        content.append(&labels);
        row.set_child(Some(&content));
        row
    }

    fn publish(self: &Rc<Self>) {
        if self.state.borrow().publishing || self.state.borrow().loading {
            return;
        }

        let prepared: Vec<Post> = self
            .state
            .borrow()
            .posts
            .iter()
            .map(Post::prepare_for_save)
            .collect();

        if let Err(error) = model::validate(&prepared) {
            self.state.borrow_mut().selected = Some(error.post_index);
            self.rebuild_sidebar();
            self.select_post(Some(error.post_index));
            self.show_toast(&error.message);
            return;
        }

        {
            let mut state = self.state.borrow_mut();
            state.posts = prepared.clone();
            state.publishing = true;
        }
        self.set_publish_spinner(true);
        self.update_status();
        self.update_actions();

        let this = self.clone();
        spawn_async(
            move || gist::save(&prepared),
            move |result| this.finish_publish(result),
        );
    }

    fn finish_publish(self: &Rc<Self>, result: Result<gist::Snapshot, GistError>) {
        {
            let mut state = self.state.borrow_mut();
            state.publishing = false;
            if result.is_ok() {
                state.dirty = false;
                state.revision = result
                    .as_ref()
                    .ok()
                    .and_then(|snapshot| snapshot.updated_at.clone());
            }
        }
        self.set_publish_spinner(false);
        self.update_status();
        self.update_actions();

        match result {
            Ok(_) => {
                let toast = adw::Toast::new("Published to the gist");
                toast.set_button_label(Some("Open"));
                toast.connect_button_clicked(|_| {
                    let _ = gio::AppInfo::launch_default_for_uri(
                        &gist::gist_url(),
                        None::<&gio::AppLaunchContext>,
                    );
                });
                self.toast_overlay.add_toast(toast);
            }
            Err(error) => {
                let dialog = adw::AlertDialog::builder()
                    .heading(error.message)
                    .body(
                        error
                            .detail
                            .unwrap_or_else(|| "Nothing was published.".to_string()),
                    )
                    .build();
                dialog.add_response("close", "Close");
                dialog.set_default_response(Some("close"));
                dialog.set_close_response("close");
                dialog.connect_response(None, |dialog: &adw::AlertDialog, _| {
                    dialog.close();
                });
                dialog.present(Some(&self.window));
            }
        }
        self.rebuild_sidebar();
    }

    fn set_publish_spinner(&self, active: bool) {
        self.editor.root.set_sensitive(!active);
        self.publish_spinner.set_visible(active);
        if active {
            self.publish_spinner.start();
            self.publish_icon.set_visible(false);
            self.publish_label.set_text("Publishing...");
        } else {
            self.publish_spinner.stop();
            self.publish_icon.set_visible(true);
            self.publish_label.set_text("Publish");
        }
    }

    fn update_status(&self) {
        let state = self.state.borrow();
        self.status_dot.remove_css_class("status-synced");
        self.status_dot.remove_css_class("status-dirty");
        self.status_dot.remove_css_class("status-busy");
        self.status_dot.remove_css_class("status-error");

        if state.loading {
            self.status_label.set_text("Loading your blog...");
            self.status_dot.add_css_class("status-busy");
        } else if state.publishing {
            self.status_label.set_text("Publishing to GitHub...");
            self.status_dot.add_css_class("status-busy");
        } else if state.dirty {
            self.status_label.set_text("Unpublished changes");
            self.status_dot.add_css_class("status-dirty");
        } else if state.error.is_some() {
            self.status_label.set_text("Could not reach the gist");
            self.status_dot.add_css_class("status-error");
        } else {
            self.status_label.set_text("Synced with the gist");
            self.status_dot.add_css_class("status-synced");
        }
    }

    fn update_actions(&self) {
        let state = self.state.borrow();
        let has_selection = state.selected.is_some();
        self.action_delete
            .set_enabled(has_selection && !state.loading && !state.publishing);
        self.action_move_up.set_enabled(
            has_selection && state.selected.unwrap_or(0) > 0 && !state.loading && !state.publishing,
        );
        self.action_move_down.set_enabled(
            has_selection
                && state.selected.unwrap_or(0) + 1 < state.posts.len()
                && !state.loading
                && !state.publishing,
        );
        self.action_publish
            .set_enabled(state.dirty && !state.loading && !state.publishing);
        self.publish_button
            .set_sensitive(state.dirty && !state.loading && !state.publishing);
    }

    fn show_toast(&self, message: &str) {
        self.toast_overlay.add_toast(adw::Toast::new(message));
    }

    fn show_about(self: &Rc<Self>) {
        let about = adw::AboutDialog::builder()
            .application_name("Netblog")
            .application_icon("net.buwryy.Netblog")
            .developer_name("buwryme")
            .developers(["buwryme <hello@buwryy.net>"])
            .copyright("© 2026 buwryme")
            .version(env!("CARGO_PKG_VERSION"))
            .website("https://buwryy.net")
            .issue_url("https://github.com/buwryme/buwryy.net/issues")
            .license_type(gtk::License::Gpl30)
            .build();
        about.add_credit_section(
            Some("Built with"),
            &["GTK 4", "libadwaita", "GtkSourceView 5", "WebKitGTK"],
        );
        about.add_acknowledgement_section(
            Some("Thanks"),
            &[
                "Arthur",
                "staraepp",
                "the VKIntox and Roseline contributors",
            ],
        );
        about.present(Some(&self.window));
    }
}

fn spawn_async<F, T, G>(work: F, done: G)
where
    F: FnOnce() -> T + Send + 'static,
    T: Send + 'static,
    G: FnOnce(T) + 'static,
{
    let (sender, receiver) = async_channel::bounded(1);
    std::thread::spawn(move || {
        let _ = sender.send_blocking(work());
    });
    glib::spawn_future_local(async move {
        if let Ok(value) = receiver.recv().await {
            done(value);
        }
    });
}
