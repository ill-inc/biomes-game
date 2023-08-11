// eslint-disable-next-line @next/next/no-document-import-in-page
import Document, { Head, Html, Main, NextScript } from "next/document";

class MyDocument extends Document {
  render() {
    return (
      <Html translate="no">
        <Head>
          <link
            rel="icon"
            type="image/x-icon"
            href="https://static.biomes.gg/favicon.ico"
          />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link
            rel="preconnect"
            href="https://fonts.gstatic.com"
            crossOrigin="anonymous"
          />
          <link
            href="https://fonts.googleapis.com/css2?family=Fira+Sans:wght@400;500;600;700&display=swap"
            rel="stylesheet"
            crossOrigin="anonymous"
          />
          <link
            href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600&display=swap"
            rel="stylesheet"
            crossOrigin="anonymous"
          />
          <link
            href="https://fonts.googleapis.com/css2?family=VT323:wght@400&display=swap"
            rel="stylesheet"
            crossOrigin="anonymous"
          />
          {process.env.NODE_ENV !== "production" && (
            <script
              dangerouslySetInnerHTML={{
                __html: `
              // Crazy hack!
              // It's actually annoyingly complex to proxy a WebSocket connection
              // in our local dev setup, it's easier to adjust the client to support
              // a custom location!
              const OrigWebSocket = window.WebSocket;
              const callWebSocket = OrigWebSocket.apply.bind(OrigWebSocket);
              window.WebSocket = function WebSocket(url, protocols) {
                if (typeof url === "string") {
                  url = url.replace(":3020", ":3000");
                }
                if (!(this instanceof WebSocket)) {
                  // eslint-disable-next-line prefer-rest-params
                  return callWebSocket(this, arguments);
                } else if (arguments.length === 1) {
                  return new OrigWebSocket(url);
                } else if (arguments.length >= 2) {
                  return new OrigWebSocket(url, protocols);
                } else {
                  return new OrigWebSocket();
                }
              };
              window.WebSocket.prototype = OrigWebSocket.prototype;
              window.WebSocket.prototype.constructor = window.WebSocket;
              `,
              }}
            />
          )}
        </Head>
        <body id="biomes-app">
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
