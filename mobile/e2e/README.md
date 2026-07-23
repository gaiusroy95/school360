# Maestro E2E tests

Install [Maestro](https://maestro.mobile.dev/) and run against a dev build on a device/emulator.

```bash
# Family app (student-parent)
cd mobile/packages/student-parent
npx expo run:android   # or run:ios — once per machine

# From mobile/
maestro test e2e/maestro/family-login.yaml
maestro test e2e/maestro/staff-login.yaml
```

Extend flows with your test credentials via environment variables or Maestro `env` blocks for CI.
