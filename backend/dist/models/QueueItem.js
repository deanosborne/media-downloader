/**
 * Queue item data model
 */
export var MediaType;
(function (MediaType) {
    MediaType["MOVIE"] = "movie";
    MediaType["TV_SHOW"] = "tv_show";
    MediaType["BOOK"] = "book";
    MediaType["AUDIOBOOK"] = "audiobook";
    MediaType["APPLICATION"] = "application";
})(MediaType || (MediaType = {}));
export var QueueStatus;
(function (QueueStatus) {
    QueueStatus["NOT_STARTED"] = "not_started";
    QueueStatus["IN_PROGRESS"] = "in_progress";
    QueueStatus["COMPLETED"] = "completed";
    QueueStatus["ERROR"] = "error";
})(QueueStatus || (QueueStatus = {}));
//# sourceMappingURL=QueueItem.js.map