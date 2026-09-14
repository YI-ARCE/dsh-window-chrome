/**
 * Host plugin body — this package contributes browser presentation and
 * window-chrome behavior only. The empty apply gives Loader a host-side row
 * while the browser half ships through `exports["./client"]`.
 */
function apply() {}
export { apply };
