# MakePace Studio

Run `npm run studio` from makepace, then open http://localhost:4885/studio.
The landing is at `/`, original batch grid at `/batch-preview`, and TikTok simulation at `/feed`.

Studio connects to the installed `codex app-server` over private stdio. Click
Connect to use the local Codex sign-in (`codex login` if needed). Each rendered
batch has its own persistent Codex thread. The selected post and manifest path
are included in each message. Responses stream into the chat; Stop interrupts
an active turn. Command/file approvals and short questions appear in the chat.
Other interactive request types return an explicit unsupported response.

The app discovers compatible `manifest.json` files under the external workspace's
`social/carousels/output`. See the root README for workspace configuration.
Batch manifests must contain posts with `images` or
`videoFile`. Use the existing rendering scripts to produce those files. Refresh
after a render to see changes. The feed supports photo carousels, videos, music,
and selected-post context. New-batch and revision buttons prepare editable chat
requests; they do not silently run a task.

Review decisions and notes are stored separately from source manifests in
ignored `.studio/state.json`, alongside local chat history/thread IDs. Creative
approval does not authorize publication. Existing historical approvals and
OneUp schedules are not rewritten. The queue view reads OneUp live; publishing
operations are requested explicitly in chat using the established scripts and
upload gate. Do not run dated batch scripts against another batch.

The server binds to 127.0.0.1, validates API Host/Origin and accepts only JSON
mutations. This is a single-user local tool, not a hosted multi-user service.
Credentials stay in the existing CLI/environment configuration and are not sent
to the frontend. No separate OpenAI API key is required for a locally signed-in
ChatGPT Codex session. Model/tool availability follows that local Codex setup;
this is not a connection to or continuation of the current T3 conversation.

Dots is optional future orchestration, not a dependency of this implementation.
Official integration: https://learn.chatgpt.com/docs/app-server
