// Webcam capture. Streams the camera into the mirrored <video> background and
// resolves once frames are actually flowing, so downstream consumers (hand
// tracking) can safely read pixels.

/**
 * Request the webcam and attach it to the given <video> element.
 * @param {HTMLVideoElement} video
 * @returns {Promise<HTMLVideoElement>} resolves when the video has dimensions
 */
export async function startCamera(video) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('This browser does not support camera access.')
  }

  let stream
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user',
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    })
  } catch (err) {
    // Normalise the common permission/hardware errors into readable messages.
    if (err?.name === 'NotAllowedError' || err?.name === 'SecurityError') {
      throw new Error('Camera permission denied. Allow access and try again.')
    }
    if (err?.name === 'NotFoundError' || err?.name === 'OverconstrainedError') {
      throw new Error('No camera found on this device.')
    }
    throw new Error(`Could not start the camera: ${err?.message || err}`)
  }

  video.srcObject = stream

  // Wait until the stream produces real frame dimensions.
  await new Promise((resolve) => {
    if (video.readyState >= 2 && video.videoWidth > 0) {
      resolve()
      return
    }
    video.addEventListener('loadeddata', () => resolve(), { once: true })
  })

  await video.play().catch(() => {
    /* autoplay is allowed because we triggered from a click; ignore races */
  })

  return video
}

/** Stop all tracks on the video's stream (cleanup). */
export function stopCamera(video) {
  const stream = video?.srcObject
  if (stream) {
    stream.getTracks().forEach((t) => t.stop())
    video.srcObject = null
  }
}
