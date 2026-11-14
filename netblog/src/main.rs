mod editor;
mod gist;
mod markdown;
mod model;
mod window;

use adw::prelude::*;
use gtk::{gdk, glib};
use libadwaita as adw;

const APPLICATION_ID: &str = "net.buwryy.Netblog";

fn main() -> glib::ExitCode {
    let application = adw::Application::builder()
        .application_id(APPLICATION_ID)
        .build();

    application.set_accels_for_action("win.new", &["<Control>n"]);
    application.set_accels_for_action("win.publish", &["<Control>s"]);
    application.set_accels_for_action("win.reload", &["<Control>r"]);
    application.set_accels_for_action("win.search", &["<Control>f"]);
    application.set_accels_for_action("win.preview", &["<Control>p"]);
    application.set_accels_for_action("win.move-up", &["<Alt>Up"]);
    application.set_accels_for_action("win.move-down", &["<Alt>Down"]);
    application.set_accels_for_action("win.delete", &["<Control><Shift>Delete"]);
    application.set_accels_for_action("win.about", &["F1"]);

    application.connect_startup(|_| {
        gtk::Window::set_default_icon_name(APPLICATION_ID);
        let provider = gtk::CssProvider::new();
        provider.load_from_string(include_str!("../data/style.css"));
        if let Some(display) = gdk::Display::default() {
            gtk::style_context_add_provider_for_display(
                &display,
                &provider,
                gtk::STYLE_PROVIDER_PRIORITY_APPLICATION,
            );
        }
    });

    application.connect_activate(|application| {
        let window = window::NetblogWindow::new(application);
        window.present();
    });

    application.run()
}
