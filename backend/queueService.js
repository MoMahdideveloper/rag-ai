const PQueue = require('p-queue').default;
const pRetry = require('p-retry');

// Create a queue with a concurrency of 1 to process tasks one by one.
// This is good for rate-limited APIs or sequential tasks.
// We can increase concurrency if needed.
const queue = new PQueue({ concurrency: 1 });

/**
 * Adds a task to the queue with retry logic.
 * @param {Function} task - The async function to execute.
 * @param {object} [retryOptions] - Options for p-retry.
 */
function addTask(task, retryOptions = {}) {
    const defaultRetryOptions = {
        retries: 3, // Try 3 times
        onFailedAttempt: error => {
            console.warn(
                `Task failed. Attempt ${error.attemptNumber}. There are ${error.retriesLeft} retries left.`
            );
        },
    };

    const finalRetryOptions = { ...defaultRetryOptions, ...retryOptions };

    // Add the task to the queue. The task itself is wrapped in pRetry.
    // We don't await the queue.add() call, making it "fire-and-forget".
    queue.add(() => pRetry(task, finalRetryOptions)).catch(error => {
        // This catch is for when the task fails after all retries.
        console.error('Task failed permanently after all retries:', error);
    });
}

module.exports = {
    addTask,
    queue, // Exporting the queue itself can be useful for monitoring
};
