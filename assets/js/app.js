// If you want to use Phoenix channels, run `mix help phx.gen.channel`
// to get started and then uncomment the line below.
// import "./user_socket.js"

// You can include dependencies in two ways.
//
// The simplest option is to put them in assets/vendor and
// import them using relative paths:
//
//     import "../vendor/some-package.js"
//
// Alternatively, you can `npm install some-package --prefix assets` and import
// them using a path starting with the package name:
//
//     import "some-package"
//
// If you have dependencies that try to import CSS, esbuild will generate a separate `app.css` file.
// To load it, simply add a second `<link>` to your `root.html.heex` file.

// Include phoenix_html to handle method=PUT/DELETE in forms and buttons.
import "phoenix_html"
// Establish Phoenix Socket and LiveView configuration.
import {Socket} from "phoenix"
import {LiveSocket} from "phoenix_live_view"
import {hooks as colocatedHooks} from "phoenix-colocated/vidsync"
import topbar from "../vendor/topbar"

const csrfToken = document.querySelector("meta[name='csrf-token']").getAttribute("content")

let customHooks = {}
customHooks.WebRTCSignaling = {
  async mounted() {
    // intial
    this.roomId = this.el.dataset.roomId;
    this.localStream = null;
    this.peerConnection = null;
    // hardware capture
    try {
          // to get both Audio and Video first
      this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    } catch (error) {
      console.warn("Camera failed or denied. Trying audio-only fallback...", error);
      try {
        // audio if the camera isn't available
        this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      } catch (audioError) {
        // Both failed 
        console.error("Both camera and microphone access were denied.", audioError);
      }
    }

    // everything yoooo
    if (this.localStream) {
      let local_video = document.getElementById("local-video");
      local_video.srcObject = this.localStream;
    }
    // channel connection and listner
    this.socket = new Socket("/socket", {params: {}})
    this.socket.connect()
    // intializing the channel 
    this.channel = this.socket.channel(`room:${this.roomId}`, {})
    //joining the channel 
    this.channel.join().receive("ok", () => 
      this.initWebRTC()
    )
    this.channel.on("video_offer", async(payload) => {
      await this.peerConnection.setRomoteDescription(new RTCSessionDescription(payload))
      const answer = await this.peerConnection.createAnswer()
      await this.peerConnection.setLocalDescription(answer)
      this.channel.push("video_answer", answer)
    })
    this.channel.on("video_answer", async(payload) => {
      await this.peerConnection.setRomoteDescription(new RTCSessionDescription(payload))
    })
    this.channel.on("ice_candidate", async(payload) => {
      if (payload) {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(payload))

      }
    })
  }, 

  initWebRTC(){
    // peer engine mechanics
    this.peerConnection = new RTCPeerConnection({
      iceServers: [{urls: "stun:stun.l.google.com:19302"
      }]
    })
    this.localStream.getTracks().forEach(track =>{
      this.peerConnection.addTrack(track, this.localStream)

    }
      )
      // capturing remote video streams 
      this.peerConnection.ontrack = (event) => {
        let remote_video = document.getElementById("remote-video")
        remote_video.srcObject = event.streams[0]

      }
      //ice network paths 
      this.peerConnection.onicecandidate = (event) => {
        if(event.candidate){
          this.channel.push("ice_candidate", event.candidate)
      }
      }
  },
  destroyed(){
    // resource cleanup 
    if(this.localStream){
      this.localStream.getTracks().forEach(track => track.stop())
    }
    // checking connection 
    if(this.peerConnection){
      this.peerConnection.close()
    }
    if(this.channel){
      this.channel.leave()
    }
  }
}


const liveSocket = new LiveSocket("/live", Socket, {
  longPollFallbackMs: 2500,
  params: {_csrf_token: csrfToken},
  hooks: {...colocatedHooks, ...customHooks},
})

// Show progress bar on live navigation and form submits
topbar.config({barColors: {0: "#29d"}, shadowColor: "rgba(0, 0, 0, .3)"})
window.addEventListener("phx:page-loading-start", _info => topbar.show(300))
window.addEventListener("phx:page-loading-stop", _info => topbar.hide())

// connect if there are any LiveViews on the page
liveSocket.connect()

// expose liveSocket on window for web console debug logs and latency simulation:
// >> liveSocket.enableDebug()
// >> liveSocket.enableLatencySim(1000)  // enabled for duration of browser session
// >> liveSocket.disableLatencySim()
window.liveSocket = liveSocket

// The lines below enable quality of life phoenix_live_reload
// development features:
//
//     1. stream server logs to the browser console
//     2. click on elements to jump to their definitions in your code editor
//
if (process.env.NODE_ENV === "development") {
  window.addEventListener("phx:live_reload:attached", ({detail: reloader}) => {
    // Enable server log streaming to client.
    // Disable with reloader.disableServerLogs()
    reloader.enableServerLogs()

    // Open configured PLUG_EDITOR at file:line of the clicked element's HEEx component
    //
    //   * click with "c" key pressed to open at caller location
    //   * click with "d" key pressed to open at function component definition location
    let keyDown
    window.addEventListener("keydown", e => keyDown = e.key)
    window.addEventListener("keyup", _e => keyDown = null)
    window.addEventListener("click", e => {
      if(keyDown === "c"){
        e.preventDefault()
        e.stopImmediatePropagation()
        reloader.openEditorAtCaller(e.target)
      } else if(keyDown === "d"){
        e.preventDefault()
        e.stopImmediatePropagation()
        reloader.openEditorAtDef(e.target)
      }
    }, true)

    window.liveReloader = reloader
  })
}

