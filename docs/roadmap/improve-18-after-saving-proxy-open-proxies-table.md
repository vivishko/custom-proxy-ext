# IMPROVE-18. After saving proxy, open proxies table (H7)

- Goal: After clicking "Save proxy", navigate to the proxies table view instead of only clearing the form.
- Value: Users immediately see the saved proxy in the list and can continue managing proxies faster.
- Priority: P1
- Complexity: S
- Dependencies: -
- Tag: H7
- Notes / questions:
  - Keep a success feedback (toast or inline message) after navigation so users know save completed.
  - 2026-02-11: Implemented as inline feedback banner on Proxies screen after successful save.
  - 2026-02-12: Manual verification completed; behavior matches spec.
