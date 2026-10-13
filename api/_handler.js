import worker from "../dist/server/index.js";

export default {
  fetch(request) {
    return worker.fetch(request, process.env);
  }
};
