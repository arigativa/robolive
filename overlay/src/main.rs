use gstreamer::{Pipeline, ElementFactory, State, MessageView};
use gstreamer::prelude::*;
use gstreamer::glib::Continue;
use glib;
use std::time::Duration;

fn main() {
  match gstreamer::init() {
    Ok(()) => {
      let inputFile = "small.mp4";
      let youtubeEndpoint = "rtmp://a.rtmp.youtube.com/live2/x/sm10-ud24-dahj-4fu5";
      
      let pipeline = Pipeline::new(Some("mypipeline"));
      let source = ElementFactory::make("filesrc", Some("source")).unwrap();
      source.set_property("location", &glib::Value::from(inputFile)).unwrap();
      let filter = ElementFactory::make("identity", Some("filter")).unwrap();
      let sink = ElementFactory::make("rtmpsink", Some("sink")).unwrap();
      sink.set_property("location", &glib::Value::from(youtubeEndpoint)).unwrap();

      pipeline.add_many(&[&source, &filter, &sink]).unwrap();
      source.link(&filter).unwrap();
      filter.link(&sink).unwrap();
      
      println!("set PAUSE");
      pipeline.set_state(State::Paused).unwrap();

      println!("register watch");
      pipeline.get_bus().unwrap()
        .add_watch(move |_, msg| {
          return match msg.view() {
            MessageView::Eos(..) => {
              println!("message: EOS");
              if pipeline.set_state(State::Null).is_err() {
                panic!("failed to terminate properly")
              }
              Continue(false)
            }
            MessageView::Error(err) => {
              println!("message: ERROR");
              eprintln!("Error: {}", err.get_error());
              Continue(false)
            }
            MessageView::AsyncDone(_) => {
              println!("message: AsyncDone");
              pipeline.set_state(State::Playing).unwrap();
              println!("start playing");
              Continue(true)
            }
            m => {
              println!("???");
              Continue(true)
            }
          };
        });

      println!("sleeping");
      std::thread::sleep(Duration::from_millis(10000));
    }
    Err(e) => {
      eprintln!("Error: {}", e);
      std::process::exit(-1)
    }
  }
}
