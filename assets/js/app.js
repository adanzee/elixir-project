// Include phoenix_html to handle method=PUT/DELETE in forms and buttons.
import "phoenix_html"
// Establish Phoenix Socket and LiveView configuration.
import {Socket} from "phoenix"
import {LiveSocket} from "phoenix_live_view"
import {hooks as colocatedHooks} from "phoenix-colocated/vidsync"
import topbar from "../vendor/topbar"

const csrfToken = document.querySelector("meta[name='csrf-token']").getAttribute("content")

let signalingSocket = new Socket("/socket", { params: { _csrf_token: csrfToken } })
signalingSocket.connect()

let customHooks = {}
customHooks.WebRTCSignaling = {
  async mounted() {
    this.roomId = this.el.dataset.roomId;
    this.username = this.el.dataset.username || "Anonymous";
    this.localStream = null;
    this.peerConnection = null;
    
    // Strict Perfect Negotiation Coordination Parameters
    this.isPolite = true; 
    this.makingOffer = false;
    this.ignoreOffer = false;
    this.isSettingRemoteDescription = false; 
    this.iceCandidateQueue = [];
    
    this.iceConfig = {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" }, 
        { urls: "stun:stun1.l.google.com:19302" }
      ]
    };

  
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "class") {
          const isHidden = this.el.classList.contains("hidden");
          if (!isHidden && !this.peerConnection) {
            console.log("DOM container active. Initializing media infrastructure...");
            this.startMediaFlow();
          }
        }
      });
    });
    
    this.observer.observe(this.el, { attributes: true });

    if (!this.el.classList.contains("hidden")) {
      this.startMediaFlow();
    }
  },

  async startMediaFlow() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    } catch (error) {
      console.warn("Camera failed, fallback to audio-only asset initialization...", error);
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      } catch (audioError) {
        console.error("Hardware access denied completely.", audioError);
      }
    }

    if (this.localStream) {
      let local_video = document.getElementById("local-video");
      if (local_video && this.localStream.getVideoTracks().length > 0) {
        local_video.srcObject = this.localStream;
      }
    }

    this.channel = signalingSocket.channel(`room:${this.roomId}`, {username: this.username});
    
    this.channel.join().receive("ok", resp => {
      console.log(`Joined signaling partition: room:${this.roomId}`, resp);
      this.initWebRTC();
      this.channel.push("peer_joined", {username: this.username});
    });

    this.channel.on("peer_joined", (payload) => {
      console.log(`Remote occupant arrived: ${payload.username}. Scheduling media negotiation...`);
      
      
      this.isPolite = false; 
      
      if (this.peerConnection) {
        // Safe timeout buffer allows subscriber mappings to settle completely across the channel cluster
        setTimeout(() => {
          if (this.peerConnection.signalingState === "stable") {
            console.log("Channel fully stabilized. Emitting priority offer...");
            this.peerConnection.onnegotiationneeded();
          }
        }, 1000); 
      }
    });

    this.channel.on("video_offer", async (payload) => {
  if (payload.sender === this.username) return; 

  try {
    let isPolite = this.username.localeCompare(payload.sender) > 0;
    
    if (this.username === payload.sender) {
      isPolite = false; 
    }

    const isCollision = this.peerConnection.signalingState !== "stable";

    if (isCollision && !isPolite) {
      console.log("Collision: Priority host ignoring remote offer frame.");
      return;
    }

    if (isCollision && isPolite) {
      console.log("Collision: Polite peer rolling back local state...");
      await this.peerConnection.setLocalDescription({ type: "rollback" });
    }

    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(payload.sdp));
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    
    this.channel.push("video_answer", { sdp: answer, sender: this.username });
  } catch (err) {
    console.error("Failed processing offer frame contract configuration:", err);
  }
  });

    this.channel.on("video_answer", async (payload) => {
      try {
       
        const sdpData = payload.sdp;
        if (!sdpData) return;

        if (this.peerConnection.signalingState !== "have-local-offer") {
          console.warn("Received answer but local state is no longer expecting one. Dropping packet safely.");
          return;
        }

        this.isSettingRemoteDescription = true;
        console.log("Applying returned answer descriptor. Channels linking up...");
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(sdpData));
        
        while (this.iceCandidateQueue.length > 0) {
          const candidate = this.iceCandidateQueue.shift();
          await this.peerConnection.addIceCandidate(candidate);
        }
      } catch (err) {
        console.error("Critical error finalizing local answer handshakes:", err);
      } finally {
        this.isSettingRemoteDescription = false;
      }
    });

    this.channel.on("ice_candidate", async (payload) => {
      try {
        if (payload) {
          const iceCandidate = new RTCIceCandidate(payload);
          if (this.isSettingRemoteDescription || !this.peerConnection || !this.peerConnection.remoteDescription || !this.peerConnection.remoteDescription.type) {
            this.iceCandidateQueue.push(iceCandidate);
          } else {
            await this.peerConnection.addIceCandidate(iceCandidate);
          }
        }
      } catch (err) {
        console.error("Candidate setup failure:", err);
      }
    });
  }, 

  initWebRTC() {
    this.peerConnection = new RTCPeerConnection(this.iceConfig);
    
    if (this.localStream){
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });
    }

    this.peerConnection.ontrack = (event) => {
      console.log("incoming remote track detected", event.track.kind);
      const remote_video = document.getElementById("remote-video");
      if (!remote_video) return;

      if (event.streams && event.streams[0]) {
        if (remote_video.srcObject) {
          remote_video.srcObject.addTrack(event.track);
        } else {
          remote_video.srcObject = event.streams[0];
        }
      } else {
        if (!this.remoteStreamFallback) {
          this.remoteStreamFallback = new MediaStream();
          remote_video.srcObject = this.remoteStreamFallback;
        }
        this.remoteStreamFallback.addTrack(event.track);
      }

      remote_video.play().catch(error => {
        console.warn("Retrying playback thread engagement...", error);
        setTimeout(() => remote_video.play(), 200);
      });
    };

    this.peerConnection.onicecandidate = (event) => {
      if(event.candidate){
        this.channel.push("ice_candidate", event.candidate);
      }
    };

    this.peerConnection.onnegotiationneeded = async () => {
      try {

        if (this.username.toLowerCase() === "bob") {
          console.log("Demo Lock: Bob is the guest. Waiting for Alice's priority offer...");
          return;
        }

        if (this.makingOffer || this.peerConnection.signalingState !== "stable") {
          return;
        }

        console.log("Negotiation needed triggered. Generating WebRTC offer...");
        this.makingOffer = true;
        
        const offer = await this.peerConnection.createOffer();
        if (this.peerConnection.signalingState === "stable") {
          await this.peerConnection.setLocalDescription(offer);
          this.channel.push("video_offer", { sdp: offer, sender: this.username });
        }
      } catch (error) {
        console.error("Negotiation failed:", error);
      } finally {
        this.makingOffer = false;
      }
    };

    this.peerConnection.onsignalingstatechange = () => {
      if (!this.peerConnection) return;
      console.log("WebRTC Signaling State Transitioned To:", this.peerConnection.signalingState);
      
      if (this.peerConnection.signalingState === "stable") {
        this.makingOffer = false;
        this.ignoreOffer = false;
      }
    };
  },

  destroyed() {
    if (this.observer) this.observer.disconnect();
    if (this.localStream) this.localStream.getTracks().forEach(track => track.stop());
    if (this.peerConnection) this.peerConnection.close();
    if (this.channel) this.channel.leave();
  }
};


customHooks.ResourceProvisioner = {
  mounted() {
    this.el.addEventListener("click", async () => {
      const micCheckbox = document.getElementById("join-with-mic");
      const videoCheckbox = document.getElementById("join-with-video");
      
      const wantsMic = micCheckbox ? micCheckbox.checked : false;
      const wantsVideo = videoCheckbox ? videoCheckbox.checked : false;

      const constraints = {
        audio: wantsMic,
        video: wantsVideo
      };

      if (!wantsMic && !wantsVideo) {
        console.log("User chose to join completely muted and hidden. Skipping hardware stream allocation.");
        this.pushEvent("hardware_access_granted", { mic_enabled: false, camera_enabled: false });
        return;
      }

      try {
        const temporaryStream = await navigator.mediaDevices.getUserMedia(constraints);
        temporaryStream.getTracks().forEach(track => track.stop());

        this.pushEvent("hardware_checked", {
          mic: document.getElementById("join-with-mic").checked,
          video: document.getElementById("join-with-video").checked
        });
      } catch (err) {
        console.error("Device initialization failed.", err);
        alert("The selected hardware devices could not be initialized. Please check browser privacy permissions.");
      }
    });
  }
};

const liveSocket = new LiveSocket("/live", Socket, {
  longPollFallbackMs: 2500,
  params: {_csrf_token: csrfToken},
  hooks: {...colocatedHooks, ...customHooks},
});

topbar.config({barColors: {0: "#29d"}, shadowColor: "rgba(0, 0, 0, .3)"});
window.addEventListener("phx:page-loading-start", _info => topbar.show(300));
window.addEventListener("phx:page-loading-stop", _info => topbar.hide());

liveSocket.connect();
window.liveSocket = liveSocket;

if (process.env.NODE_ENV === "development") {
  window.addEventListener("phx:live_reload:attached", ({detail: reloader}) => {
    reloader.enableServerLogs();
    let keyDown;
    window.addEventListener("keydown", e => keyDown = e.key);
    window.addEventListener("keyup", _e => keyDown = null);
    window.addEventListener("click", e => {
      if(keyDown === "c"){
        e.preventDefault();
        e.stopImmediatePropagation();
        reloader.openEditorAtCaller(e.target);
      } else if(keyDown === "d"){
        e.preventDefault();
        e.stopImmediatePropagation();
        reloader.openEditorAtDef(e.target);
      }
    }, true);
    window.liveReloader = reloader;
  });
}