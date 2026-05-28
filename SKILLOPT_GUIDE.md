> [!WARNING]
> FROZEN: References ignored external SkillOpt checkout paths. Reinstall/update SkillOpt before following this guide.
> Registry: [DOCS_FREEZE.md](./DOCS_FREEZE.md)

# VibeCoder Prompt Optimization Guide (using Microsoft SkillOpt)

This guide explains how to use the integrated **Microsoft SkillOpt** framework inside the VibeCoder repository to automatically optimize, test, and audit prompts for our AI features.

Rather than manual prompt engineering (which is slow and error-prone), SkillOpt treats our prompts (stored as Markdown "skills") as trainable parameters, optimizing them iteratively against a validation dataset.

---

## 1. Directory Structure

The framework and templates are located in:
- **SkillOpt Codebase**: [tools/SkillOpt/](file:///Users/yudeyou/Desktop/VC/tools/SkillOpt) (cloned repo and virtual environment)
- **Virtual Environment**: [tools/SkillOpt/venv/](file:///Users/yudeyou/Desktop/VC/tools/SkillOpt/venv)
- **VibeCoder Configurations**: [tools/SkillOpt/configs/vibecoder/](file:///Users/yudeyou/Desktop/VC/tools/SkillOpt/configs/vibecoder)
- **VibeCoder Datasets & Skills**: [tools/SkillOpt/data/vibecoder/](file:///Users/yudeyou/Desktop/VC/tools/SkillOpt/data/vibecoder)
- **VibeCoder Environment Implementation**: [tools/SkillOpt/skillopt/envs/vibecoder/](file:///Users/yudeyou/Desktop/VC/tools/SkillOpt/skillopt/envs/vibecoder)

---

## 2. Environment Activation

Before running any script, activate the Python virtual environment and navigate to the SkillOpt directory:

```bash
# Navigate to the SkillOpt folder
cd tools/SkillOpt

# Activate the virtual environment
source venv/bin/activate
```

---

## 3. Configuring API Keys

SkillOpt requires API access to run the optimization loop. You must export your API keys as environment variables:

```bash
# For OpenAI models (e.g., gpt-4o used as the optimizer)
export OPENAI_API_KEY="your-openai-api-key"

# For DeepSeek (e.g., deepseek-chat used as the target model)
export DEEPSEEK_API_KEY="your-deepseek-api-key"
```

---

## 4. Running the Optimization Loop (Training)

To start the automated optimization process for the VibeCoder AI Investment Assistant:

```bash
# Ensure you are inside tools/SkillOpt and venv is active
python scripts/train.py --config configs/vibecoder/project_eval.yaml
```

### What happens behind the scenes:
1. **Dataloader** splits your `data/vibecoder/project_eval/dataset.json` into `train/`, `val/`, and `test/` sets using the `1:1:1` ratio.
2. **Rollout**: The target model evaluates the projects using the baseline prompt (`initial_skill.md`).
3. **Reflection**: The optimizer model analyzes mistakes and suggests targeted edits to the prompt.
4. **Validation Gate**: Candidate prompts are validated against the validation set. Improvements are accepted, regressions are rolled back.
5. **Output**: The best prompt is saved to `outputs/best_skill.md`.

---

## 5. Running the Gradio WebUI Dashboard

To monitor training progress, view reflection logs, and compare prompt diffs visually:

```bash
# Start the WebUI server
python skillopt_webui/app.py
```
Open [http://localhost:7860](http://localhost:7860) in your browser.

---

## 6. How to Extend SkillOpt for Other VibeCoder Modules

You can easily adapt SkillOpt to optimize prompts for other AI features in our system.

### A. AI Milestone Autochecker (自动验收审计)
To optimize the prompt that audits developer milestones before unlocking fund payouts:
1. Create a dataset in `data/vibecoder/milestone_check/dataset.json` containing mock milestone submissions:
   - **Input**: The code URL, milestone description, and actual commits.
   - **Answer**: `["APPROVED"]` (if genuine work done) or `["REJECTED"]` (if spam or empty work).
2. Create an initial prompt `data/vibecoder/milestone_check/initial_skill.md` explaining how to audit the commits/code.
3. Add a configuration file `configs/vibecoder/milestone_check.yaml` pointing to these directories.
4. Run training:
   ```bash
   python scripts/train.py --config configs/vibecoder/milestone_check.yaml
   ```

### B. TON Agentic Wallets (智能钱包自动操作)
To optimize the tool-use capability of autonomous trading/voting agents:
1. Gather a set of user intents (e.g., *"I want to vote yes on proposal 2 if the token price is above 1 TON"*).
2. Ground truth: The correct JSON tool invocation sequence (e.g. `[{"tool": "vote", "params": {"proposal": 2, "vote": "yes"}}]`).
3. Run SkillOpt to train the few-shot examples and system instructions until the target model achieves 100% correct tool invocation.

---

## 7. Deploying Optimized Prompts to Production

Once SkillOpt outputs the optimized prompt (`outputs/best_skill.md`), simply copy its markdown content directly into VibeCoder Hono backend Hono controllers or services (e.g., inside [index.ts](file:///Users/yudeyou/Desktop/VC/worker/src/index.ts) or [agentic.ts](file:///Users/yudeyou/Desktop/VC/worker/src/services/agentic.ts)).

This ensures your production environment benefits from the optimized accuracy with **zero additional run-time cost**.
