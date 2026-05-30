# ENTRAL v0.3 Access Audit

Source of truth: `ENTRAL_V0_3_GOAL_SPEC.md`

No essential feature should require more than 3 taps/clicks from the main interface.

| Feature | Current Access Path | Taps / Clicks | Problem | Fix Implemented |
| --- | --- | ---: | --- | --- |
| Create Marshal | Command console suggestion or text command | 1-2 | Previously could execute without preview | Yes: command creation now asks for authorization |
| Create Business | First mission card, command suggestion, command palette, wizard | 1-2 | Needed clearer approval preview | Yes: wizard/template creation now asks for authorization |
| Create Commander | Dashboard structure actions or command console | 1-2 | Requires selected General; needs clearer no-parent messaging | Partial: no-parent messaging exists |
| Create Soldier | Dashboard structure actions or command console | 1-2 | Requires selected Commander; needs clearer no-parent messaging | Partial: no-parent messaging exists |
| Generate Report | Command console | 1 | Works through report/briefing commands | No change |
| Open Tasks | Mobile Tasks tab, command palette, or command text | 1 | Previously mobile lacked dedicated task center | Yes: mobile task panel added |
| Open Hierarchy | Dashboard default / mobile Hierarchy tab | 0-1 | Mobile tree was not separate | Yes: mobile hierarchy tree added |
| Open Graph | Dashboard default | 0 | Works | No change |
| Start Tutorial | Command palette, settings, command text | 1-2 | Tutorial behavior needed v0.3 hierarchy flow alignment | Improved: Academy modules now match v0.3 and walkthrough preparation opens hidden targets before highlighting |
| Use Voice | Voice button, `start voice guide`, or settings | 1 | Needed clearer guide routing | Partial: voice guide opens settings and explains modes |
| Open Business General | Click node / mobile Navigate / command text | 1-2 | Empty state now helps start first business | Partial |
| Open Template Wizard | First mission card / command text / palette | 1-2 | Needed full v0.3 template coverage and business context capture | Improved with seven required templates, preferred Marshal, optional context fields, and authorization preview |
| Open Help | Type `help` or click suggestion on empty state | 1 | Previously hidden behind generic command behavior | Yes |
| Open Reports | Mobile Reports tab or command text | 1 | Mobile report center needed real structured report content | Yes: mobile report feed added and now filters to structured reports only |
| Open Mobile Guide | Command text or mobile More tab | 1 | Needs live-device QA | Improved: guide content describes bottom tabs and touch controls |

## Current Access Risks

- Mobile now has bottom-tab Command / Hierarchy / Tasks / Reports / More navigation.
- Command console remains the most complete access surface.
- Keyboard shortcuts are no longer required for core functionality, but the command palette is still useful as a visible action index.
- The new mobile panels still need live phone/browser QA for exact fit and touch comfort.
- Voice guide requests now open voice settings and explain push-to-talk/report modes. Academy now includes a Voice Guide module, but live browser microphone QA is still required.

## Recommended Next Fixes

1. QA the mobile bottom tabs and Academy spotlights on a real phone viewport.
2. Tune mobile panel heights if the command console or side panel crowds short screens.
3. Add tests around mobile-only panel rendering when dashboard component testing is split.
