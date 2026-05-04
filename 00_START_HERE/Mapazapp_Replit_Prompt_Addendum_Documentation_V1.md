# Mapazapp — Prompt Addendum for Replit V1

Add this instruction to the Replit prompt:

```text
Documentation requirement:
Besides building the visual dashboard mock, document everything you create so Cursor can continue the project later.

Create or update:
- README.md
- docs/CURSOR_HANDOFF.md
- docs/MOCK_DATA_CONTRACT.md
- docs/DECISIONS.md if you make relevant implementation decisions

The documentation must clearly explain:
- what was built
- what is mock data
- what is not implemented
- what files/components were created
- what future APIs should replace the mocks
- how Cursor should continue
- that no real MT5 connection, backend, trading logic, backtesting, or order execution is implemented in this Replit phase

Do not hide fake trading logic inside components. Keep mock values in mock data files and document them.
```
