# Bug: Enable only on this page disables proxy

Raw notes:
- Steps: enable proxy -> shows "Proxy: test_proxy_germany (Global)".
- Click "Enable only on this page".
- Result: status changes to "Proxy temporarily disabled for www.linkedin.com.".
- Expected: proxy should stay enabled for current domain only; disabled elsewhere.
- Concern: current UI suggests proxy is turned off for the current site, which is opposite of intent.
- Need: allow selecting a proxy for the "Enable only on this page" mode.
