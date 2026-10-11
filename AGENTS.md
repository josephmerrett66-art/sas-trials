# Performance requirement

The user requires all future additions to target a minimum of 60 FPS (16.67 ms per frame).
Treat performance as an acceptance criterion for every gameplay or visual change. Reuse
effects and materials, bound active objects, avoid per-frame allocations, and avoid new
dynamic lights or shadow passes unless measurements justify their cost.

Run the relevant functional checks and the existing `?benchmark=1&weapon=1` browser
stress test for rendering changes. Save results, compare frame times and draw calls,
and optimize any regression before completing the change. Do not claim a locked
60 FPS from an average alone. The current baseline is below 60 FPS on the development
Mac; report that limitation honestly until measured frame times meet the budget.
