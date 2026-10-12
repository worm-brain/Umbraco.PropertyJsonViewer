/** Alias of the "View raw value" property action. */
export const VIEW_RAW_VALUE_ACTION_ALIAS = "Umbraco.Community.PropertyJsonViewer.PropertyAction.ViewRawValue";

/** Alias of the raw value drawer (a sidebar modal). */
export const RAW_VALUE_MODAL_ALIAS = "Umbraco.Community.PropertyJsonViewer.Modal.RawValue";

/**
 * The document permission that allows reading raw values. Must match `PropertyJsonViewerPermissions.Read` on the
 * server, which enforces it; the client only uses it to hide the action.
 */
export const READ_PERMISSION = "PropertyJsonViewer.Read";

/** Alias of the "View raw property values" document permission. */
export const READ_PERMISSION_ALIAS = "Umbraco.Community.PropertyJsonViewer.EntityUserPermission.Document.Read";

/**
 * Core condition that checks the current user's document permissions on the nearest entity (granular
 * permissions first, then the user groups' defaults). Spelled out rather than imported so the registration
 * module does not load the document package.
 */
export const DOCUMENT_USER_PERMISSION_CONDITION_ALIAS = "Umb.Condition.UserPermission.Document";
