As it couldn't be any other way, given that this is my first attempt at a final project for the Data Engineering Zoomcamp, I built this project alone — with the help of Artificial Intelligence (Claude Code), though. And all in less than two weeks.

The usual narrative about AI and code tends to be simplified into two extremes: either it's magic that writes everything, or it's a glorified autocomplete. My experience doesn't fit either one. The closest analogy is having a very fast teammate with a good memory, whom you have to guide with judgment.

Guide, not delegate. When I ask it to write a parser for a new BOC format, I don't say "write me a parser." I give it context: how the existing parsers work, what pattern they follow, what fixtures I use for testing, what normalization I apply to sections. The result isn't generic code: it's code that fits the project's architecture.

For me, where it adds the most value isn't in writing new code but in the tasks a solo developer tends to postpone. Tests, for example. I have thirty test files between Python and TypeScript. Many of those tests were generated with Claude Code from the BOC's real fixtures — the same HTML and PDF files the system processes in production. I define what each test should verify, what case it covers, what invariant it protects. The tool generates the implementation.

Refactorings are another case. When I needed to change how search queries are built on the frontend, Claude Code had context of the entire repository: the repository pattern, the Prisma queries, the TypeScript types, and the existing unit and integration tests. I was able to iterate on the refactoring in minutes, verifying at each step that the tests still passed. A solo developer without this tool would have taken days — or would have postponed the refactoring.

It has also changed the way I explore design decisions. Before implementing, I ask. Should I put section normalization in the parser or in the loading step? Should I use a materialized view or a table for coverage metrics? I don't accept the first answer: I raise objections, ask it to consider the implications on the existing code, and compare with what I already have.

In the end, I don't just have more code — I have more reliable and easier-to-modify code. Tests document the expected behavior. Continuous refactorings keep technical debt low. Documentation gets written when the context is fresh, not weeks later. A solo developer with these tools doesn't produce the same as a team, but produces considerably more than they would alone. And with sustainable quality.

#DataEngineering #LearningInPublic #DataTalksClub #ClaudeCode #AI #OpenData #CanaryIslands
