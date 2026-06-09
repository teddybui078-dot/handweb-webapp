 Workflow Orchestration

### 1. Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. SKILL.md Strategy
- Write a SKILL.md file for any reusable workflow, pattern, or domain knowledge that recurs across tasks
- Each skill is a single focused capability -- one trigger, one purpose, no kitchen sinks
- Frontmatter must include `name` and a precise `description` (when to invoke, not what it is)
- Keep skills under ~150 lines; link to references for deep detail rather than inlining everything
- Invoke existing skills before improvising -- if a skill applies even at 1% odds, use it
- After repeated corrections on the same topic, promote the lesson into a skill so it self-applies next time
- Store project-specific skills in `.claude/skills/`; review and prune stale ones at session start

### 4. Self-Improvement Loop
- After ANY correction from the user: update tasks/lessons.md with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 5. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 6. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes -- don't over-engineer
- Challenge your own work before presenting it

### 7. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests -- then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

# Task Management

1. **Plan First**: Write plan to tasks/todo.md with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to tasks/todo.md
6. **Capture Lessons**: Update tasks/lessons.md after corrections
7. **Work Verifcation**: Ask for specific questions (when asking questions, always give interactive options, interactive Q and A's)
8. **Step by Step**: Break down the problem into smaller steps and solve each step one by one
9. **Be Collaborative**: Collaborate with users to achieve their goals
10. **Be Adaptable**: Adapt to changing requirements and priorities

# Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Only touch what's necessary. No side effects with new bugs.

### 8. Folders and Files
- `.env` -- credentials, API keys, and environment-specific secrets
- `.claude/agents/` -- where project subagents live
- `.claude/skills/` -- where project skills live
- `tools/` -- custom scripts, CLIs, and utilities the agents/workflows can invoke
- `workflows/` -- any routines, flows the project goes through
- 'features/' -- core features this project has
- IMPORTANT: Always set these folders up before starting any action, wether its crafting a plan, draft, or building.

### 9. Ending Notes
- Always deploy subagents and skills
- Create USEFUL subagents and skills, not just random ones
- Create Agent Teams if you ever need Subagents to communicate with each other
- (IMPORTANT) When inquiring the user about ANYTHING to gather information to help build something better, always use interactive questions.