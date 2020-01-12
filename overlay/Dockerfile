FROM ubuntu

RUN apt update
RUN apt install -y \
        libgstreamer1.0-dev libgstreamer-plugins-base1.0-dev \
        gstreamer1.0-plugins-base gstreamer1.0-plugins-good \
        gstreamer1.0-plugins-bad gstreamer1.0-plugins-ugly \
        gstreamer1.0-libav libgstrtspserver-1.0-dev

RUN apt install -y libwebkit2gtk-4.0-dev libcairo-dev liborc-0.4-dev
RUN apt install -y git
RUN apt install -y build-essential autoconf libtool

RUN mkdir /build

# gst-webkit build
RUN git clone https://github.com/Kalyzee/gst-webkit.git /build/gst-webkit
WORKDIR /build/gst-webkit 
RUN ./autogen.sh
RUN make
RUN make install

# install Rust
RUN curl https://sh.rustup.rs -sSf | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"
RUN rustup update

# build app

RUN mkdir /build/app
WORKDIR /build/app

# Vendor stuff to a different layer
ADD Cargo.toml ./
ADD Cargo.lock ./
RUN mkdir .cargo
RUN cargo vendor > .cargo/config

ADD . ./

RUN cargo build -j 16 --color=always --package overlay --bin overlay

CMD ./target/debug/overlay

