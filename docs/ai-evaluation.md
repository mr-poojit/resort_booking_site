# AI Router Evaluation Snapshot

Command: `npm run eval:ai`

Dataset: 24 hand-labeled demo messages, including the three required examples, six complaint cases, room/event examples, Hinglish, ambiguous requests, spam, and an instruction-injection attempt.

| Measure                        |         Result |
| ------------------------------ | -------------: |
| Rules-router category accuracy | 100.0% (24/24) |
| Complaint alert recall         |   100.0% (6/6) |

This is a deterministic rules-router smoke/evaluation set authored alongside the implementation, not an independent benchmark and not a claim about real-world accuracy. Complaint alerting is a separate keyword/rules override. Low-confidence and ambiguous messages are routed to the Unsorted lane; medium-confidence labels are marked “Check category”.
