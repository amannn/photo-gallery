/**
 * This is the animation loop that can be used to solve spring (and
 * potentially also other) equations over time.
 *
 * This is based on the implementation of iamralpht. Have a look at it here:
 * https://github.com/iamralpht/iamralpht.github.io/tree/master/physics
 */

function processFrame(handle, physicsModel, onFrame, onFinish) {
  if (handle && handle.cancelled) return;

  onFrame(physicsModel);

  if (!physicsModel.done() && !handle.cancelled) {
    handle.id = requestAnimationFrame(
      processFrame.bind(null, handle, physicsModel, onFrame, onFinish)
    );
  } else if (onFinish) {
    onFinish();
  }
}

function cancel(handle) {
  if (handle && handle.id) cancelAnimationFrame(handle.id);
  if (handle) handle.cancelled = true;
}

/**
 * This function sets up a rAF-based timer which calls the callback
 * every frame while the physics model is still moving.
 * @param {Object} physicsModel
 * @param {Function} onFrame
 * @param {Function} onFinish
 * @return {Object} Exposes a `cancel` function.
 */
export default function runAnimation(physicsModel, onFrame, onFinish) {
  const handle = {id: 0, cancelled: false};
  processFrame(handle, physicsModel, onFrame, onFinish);
  return {cancel: cancel.bind(null, handle), model: physicsModel};
}
