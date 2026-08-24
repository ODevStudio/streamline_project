export function createLatestTaskRunner(run, onError) {
    let active = false;
    let latest = null;

    const drain = async (first) => {
        active = true;
        let current = first;
        while (current) {
            latest = null;
            try {
                await run(current);
            } catch (error) {
                onError(error);
            }
            current = latest;
        }
        active = false;
    };

    return (task) => {
        if (active) {
            latest = task;
            return;
        }
        void drain(task);
    };
}
