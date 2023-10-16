// file: src/server/task-queue.ts
type TaskRecord = {
	task: () => void;
	priorityId: string | undefined;
	eject: boolean;
	next: TaskRecord | undefined;
};

type PriorityMap = Map<string, TaskRecord>;

const RUN_DELAY = 300;

const makeTaskRecord = (
	task: () => void,
	priorityId?: string,
	eject: boolean = false
) => ({ task, priorityId, eject, next: undefined });

let queuedId: ReturnType<typeof setTimeout> | undefined;
const taskQueue: TaskRecord[] = [];

const priorityMap: PriorityMap = new Map();

// Process **everything** on the queue
function runQueue() {
	priorityMap.clear();
	for (let i = 0; i < taskQueue.length; i += 1) taskQueue[i].task();

	taskQueue.length = 0;
	queuedId = undefined;
}

function queueTask(record: TaskRecord) {
	taskQueue.push(record);

	if (typeof queuedId !== 'undefined') return;
	queuedId = setTimeout(runQueue, RUN_DELAY);
}

// For non-ejectable or first ejectable tasks
function queueTaskWithId(record: TaskRecord) {
	priorityMap.set(record.priorityId, record);
	queueTask(record);
}

// For ejectable tasks after the first
function appendEjectable(head: TaskRecord, last: TaskRecord) {
	let record = head;
	for (; record.next; record = record.next);
	record.next = last;

	queueTask(record);
}

function ejectTasks(record: TaskRecord) {
	for (let next = record; next; next = record.next) {
		const index = taskQueue.indexOf(next);
		if (index > -1) taskQueue.splice(index, 1);
	}
}

function submitTask(
	task: () => void,
	priorityId?: string,
	eject: boolean = false
) {
	if (typeof priorityId === 'undefined') {
		queueTask(makeTaskRecord(task));
		return;
	}

	const found = priorityMap.get(priorityId);
	if (!found) {
		queueTaskWithId(makeTaskRecord(task, priorityId, eject));
		return;
	}

	if (!found.eject) {
		// found task will take care of it
		return;
	}

	const record = makeTaskRecord(task, priorityId, eject);

	if (record.eject) {
		appendEjectable(found, record);
		return;
	}

	// new task will replace ejectables
	ejectTasks(found);
	queueTaskWithId(record);
}

export { submitTask };
