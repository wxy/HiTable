# HiTable — Chrome Web Store submission reference

Maintainer reference for 0.2.2. Store descriptions are in `docs/store-descriptions`; screenshots and promotional artwork are in `docs/assets`. Final store submission is performed by the maintainer.

## Single purpose

HiTable provides in-page statistics for selected web-table cells. Users drag a range, choose among 15 statistics at the four edges, resize the selection and copy data or results. Display, calculations and copying use one snapshot. All table processing stays in the browser; there is no account, analytics service or table-data upload.

Supported layouts include HTML tables with merged or nested cells, detected CSS Grid / Flexbox tables and ARIA grids. Source-number settings handle ambiguous separators, including Romanian decimal commas and RON / MDL / leu / lei; no currency conversion is performed.

## Permission explanations

### tabs

Reads tab URLs and tracks activation per tab. In automatic activation mode, this allows HiTable to recognize previously enabled domains and apply the user's activation preference.

### activeTab

Allows user-triggered activation on the current page so HiTable can read table cells and display the selection and statistics overlay.

### scripting

Injects the table detector, local calculations, theme styles and selection handlers when activated, and runs cleanup when deactivated. Activation takes over table selection gestures; deactivation restores the page's original controls.

### contextMenus

Adds the extension-icon menu entries for settings, demo and help.

### storage

Stores preferences such as activation domains, algorithms, themes and number format. Selected table data is held in memory for the current snapshot and is not saved as a browsing-data archive.

### host_permissions

Allows HiTable to inject its local scripts on supported HTTP, HTTPS and file pages when activated, including automatic activation on enabled domains. Page URLs and table values are not transmitted to an external service.
