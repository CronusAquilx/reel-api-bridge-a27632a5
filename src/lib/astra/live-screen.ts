/** Capture requires the local user's browser permission, never silent remote activation. */
export type ScreenSignal = { type: "offer" | "answer"; description: RTCSessionDescriptionInit } | { type: "ice"; candidate: RTCIceCandidateInit } | { type: "stopped" };
export function createScreenPeer(send: (signal: ScreenSignal) => void) {
  const peer = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
  const pending: RTCIceCandidateInit[] = [];
  peer.onicecandidate = ({ candidate }) => { if (candidate) send({ type: "ice", candidate: candidate.toJSON() }); };
  return { peer, async receive(signal: ScreenSignal) {
    if (signal.type === "ice") {
      if (peer.remoteDescription) await peer.addIceCandidate(signal.candidate);
      else pending.push(signal.candidate);
    } else if (signal.type === "offer" || signal.type === "answer") {
      await peer.setRemoteDescription(signal.description);
      for (const candidate of pending.splice(0)) await peer.addIceCandidate(candidate);
      if (signal.type === "offer") {
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        send({ type: "answer", description: answer });
      }
    }
  } };
}