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

function appendEjectable(head: TaskRecord, last: TaskRecord) {
	let record = head;
	for (; record.next; record = record.next);
	record.next = last;
}

let queuedId: ReturnType<typeof setTimeout> | undefined;
const taskQueue: TaskRecord[] = [];

function ejectTasks(record: TaskRecord) {
	for (let next = record; next; next = record.next) {
		const index = taskQueue.indexOf(next);
		if (index > -1) taskQueue.splice(index, 1);
	}
}

const priorityMap: PriorityMap = new Map();

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
		queueTask(makeTaskRecord(task, priorityId, eject));
		return;
	}

	if (!found.eject) {
		// found task will take care of it
		return;
	}

	const record = makeTaskRecord(task, priorityId, eject);

	if (!record.eject) {
		// new task will replace ejectables
		ejectTasks(found);
		priorityMap.set(priorityId, record);
	} else {
		// another ejectable
		appendEjectable(found, record);
	}

	queueTask(record);
}

export { submitTask };
