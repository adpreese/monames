import { useMemo, useState } from 'react';

const ROLE_LABELS = {
  spymaster: 'Spymaster',
  guesser: 'Guesser'
};

const emptyPackForm = {
  id: null,
  name: '',
  words: ''
};

const emptyPersonaForm = {
  id: null,
  role: 'spymaster',
  label: '',
  prompt: ''
};

const ANTHROPIC_MODELS = [
  'claude-sonnet-4-5-20250929',
  'claude-3-5-sonnet-20240620',
  'claude-3-opus-20240229',
  'claude-3-haiku-20240307'
];

const OPENAI_MODELS = ['gpt-4o', 'gpt-4o-mini', 'o1-mini', 'o1-preview', 'gpt-4.1'];

const OPENROUTER_MODELS = [
  'anthropic/claude-sonnet-4-5',
  'anthropic/claude-3.5-sonnet',
  'openai/gpt-4o',
  'openai/gpt-4o-mini',
  'google/gemini-pro-1.5',
  'meta-llama/llama-3.1-70b-instruct'
];

const REASONING_EFFORT_OPTIONS = [
  { value: '', label: 'Default' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' }
];

const Settings = ({
  apiConfig,
  onApiConfigChange,
  customPacks,
  onSavePack,
  onDeletePack,
  onCsvUpload,
  personas,
  selectedPersonas,
  onSelectPersona,
  onSavePersona,
  onDeletePersona,
  statusMessage
}) => {
  const [showApiKey, setShowApiKey] = useState(false);
  const [packForm, setPackForm] = useState(emptyPackForm);
  const [personaForm, setPersonaForm] = useState(emptyPersonaForm);
  const [advancedSettingsExpanded, setAdvancedSettingsExpanded] = useState(false);
  const [wordPacksExpanded, setWordPacksExpanded] = useState(false);
  const [personasExpanded, setPersonasExpanded] = useState(false);

  const modelOptions = useMemo(() => {
    if (apiConfig?.provider === 'openai') {
      return OPENAI_MODELS;
    }
    if (apiConfig?.provider === 'anthropic') {
      return ANTHROPIC_MODELS;
    }
    if (apiConfig?.provider === 'openrouter') {
      return OPENROUTER_MODELS;
    }
    return Array.from(new Set([...ANTHROPIC_MODELS, ...OPENAI_MODELS, ...OPENROUTER_MODELS]));
  }, [apiConfig?.provider]);

  const modelSelectValue = modelOptions.includes(apiConfig.model) ? apiConfig.model : 'custom';

  const paramsValidation = useMemo(() => {
    if (!apiConfig?.paramsJson?.trim()) {
      return {
        isValid: true,
        message: 'Optional JSON object merged into the request body.'
      };
    }
    try {
      const parsed = JSON.parse(apiConfig.paramsJson);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return {
          isValid: false,
          message: 'JSON params must be a single object (ex: {"temperature":0.2}).'
        };
      }
      return {
        isValid: true,
        message: 'JSON params look good.'
      };
    } catch (error) {
      return {
        isValid: false,
        message: `Invalid JSON: ${error.message}`
      };
    }
  }, [apiConfig?.paramsJson]);

  const handleApiConfigChange = (updates) => {
    onApiConfigChange({ ...apiConfig, ...updates });
  };

  const detectProviderFromApiKey = (key) => {
    if (!key) return null;

    // Anthropic keys start with 'sk-ant-'
    if (key.startsWith('sk-ant-')) {
      return 'anthropic';
    }

    // OpenAI keys start with 'sk-' (but not 'sk-ant-')
    if (key.startsWith('sk-') && !key.startsWith('sk-ant-')) {
      return 'openai';
    }

    return null;
  };

  const handleApiKeyChange = (newKey) => {
    const detectedProvider = detectProviderFromApiKey(newKey);
    const updates = { apiKey: newKey };

    // Auto-set provider if detected
    if (detectedProvider) {
      updates.provider = detectedProvider;
    }

    handleApiConfigChange(updates);
  };

  const handleModelSelect = (event) => {
    const nextValue = event.target.value;
    if (nextValue === 'custom') {
      handleApiConfigChange({ model: '' });
      return;
    }
    handleApiConfigChange({ model: nextValue });
  };

  const packWordCount = useMemo(
    () => packForm.words.split(/\r?\n|,/).filter((word) => word.trim()).length,
    [packForm.words]
  );

  const personaOptions = useMemo(
    () =>
      personas.reduce(
        (acc, persona) => {
          acc[persona.role].push(persona);
          return acc;
        },
        { spymaster: [], guesser: [] }
      ),
    [personas]
  );

  const handlePackEdit = (pack) => {
    setPackForm({
      id: pack.id,
      name: pack.name,
      words: pack.words.join('\n')
    });
  };

  const handlePackReset = () => setPackForm(emptyPackForm);

  const handlePackSubmit = (event) => {
    event.preventDefault();
    onSavePack(packForm);
    setPackForm(emptyPackForm);
  };

  const handlePersonaEdit = (persona) => {
    setPersonaForm({
      id: persona.id,
      role: persona.role,
      label: persona.label,
      prompt: persona.prompt
    });
  };

  const handlePersonaReset = () => setPersonaForm(emptyPersonaForm);

  const handlePersonaSubmit = (event) => {
    event.preventDefault();
    onSavePersona(personaForm);
    setPersonaForm(emptyPersonaForm);
  };

  return (
    <section className="panel">
      <h2>Settings</h2>

      <div className="settings-section">
        <h3>API configuration</h3>
        <div className="field">
          <label htmlFor="api-key">API key</label>
          <div className="field-row">
            <input
              id="api-key"
              type={showApiKey ? 'text' : 'password'}
              value={apiConfig.apiKey}
              onChange={(event) => handleApiKeyChange(event.target.value)}
              placeholder="sk-... or sk-ant-..."
            />
            <button
              type="button"
              className="secondary"
              onClick={() => setShowApiKey((prev) => !prev)}
            >
              {showApiKey ? 'Hide' : 'Show'}
            </button>
          </div>
          <small>
            Stored in local storage on this device. Provider is auto-detected from key format.
          </small>
        </div>
        <div className="field">
          <label htmlFor="provider-select">Provider</label>
          <select
            id="provider-select"
            value={apiConfig.provider}
            onChange={(event) => handleApiConfigChange({ provider: event.target.value })}
          >
            <option value="anthropic">Anthropic (Claude)</option>
            <option value="openai">OpenAI</option>
            <option value="openrouter">OpenRouter</option>
            <option value="custom">Custom (use base URL)</option>
          </select>
          <small className="helper">
            Anthropic uses the Claude messages API. OpenAI and OpenRouter send chat
            completions payloads. Custom uses the base URL as the full endpoint.
          </small>
        </div>
        <div className="field">
          <label htmlFor="model-select">Model</label>
          <select id="model-select" value={modelSelectValue} onChange={handleModelSelect}>
            {modelOptions.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
            <option value="custom">Custom…</option>
          </select>
          {modelSelectValue === 'custom' && (
            <input
              id="model-name"
              value={apiConfig.model}
              onChange={(event) => handleApiConfigChange({ model: event.target.value })}
              placeholder="Enter a model ID"
            />
          )}
          <small className="helper">
            Pick from common model IDs or enter a custom one.
          </small>
        </div>
        <div className="field">
          <label htmlFor="base-url">Base URL</label>
          <input
            id="base-url"
            value={apiConfig.baseUrl}
            onChange={(event) => handleApiConfigChange({ baseUrl: event.target.value })}
            placeholder="https://api.anthropic.com"
          />
          <small className="helper">
            Leave blank to use the default for the selected provider.
          </small>
        </div>

        <div className="settings-subsection">
          <button
            type="button"
            className="collapse-toggle"
            onClick={() => setAdvancedSettingsExpanded((prev) => !prev)}
          >
            <span className="toggle-icon">{advancedSettingsExpanded ? '▼' : '▶'}</span>
            Advanced Settings
          </button>
          {advancedSettingsExpanded && (
            <div className="collapsible-content">
              <div className="field">
                <label htmlFor="max-tokens">Max tokens</label>
                <input
                  id="max-tokens"
                  type="number"
                  min="1"
                  value={apiConfig.maxTokens}
                  onChange={(event) => handleApiConfigChange({ maxTokens: event.target.value })}
                  placeholder="400"
                />
                <small className="helper">Upper limit for generated tokens.</small>
              </div>
              <div className="field">
                <label htmlFor="temperature">Temperature</label>
                <input
                  id="temperature"
                  type="number"
                  min="0"
                  step="0.1"
                  value={apiConfig.temperature}
                  onChange={(event) => handleApiConfigChange({ temperature: event.target.value })}
                  placeholder="0.2"
                />
                <small className="helper">Controls randomness. Lower is more deterministic.</small>
              </div>
              <div className="field">
                <label htmlFor="top-p">Top P</label>
                <input
                  id="top-p"
                  type="number"
                  min="0"
                  step="0.05"
                  value={apiConfig.topP}
                  onChange={(event) => handleApiConfigChange({ topP: event.target.value })}
                  placeholder="1"
                />
                <small className="helper">Nucleus sampling for compatible providers.</small>
              </div>
              {apiConfig.provider === 'anthropic' ? (
                <div className="field">
                  <label htmlFor="top-k">Top K (Anthropic)</label>
                  <input
                    id="top-k"
                    type="number"
                    min="0"
                    step="1"
                    value={apiConfig.topK}
                    onChange={(event) => handleApiConfigChange({ topK: event.target.value })}
                    placeholder="0"
                  />
                  <small className="helper">
                    Optional top-k sampling for Anthropic messages.
                  </small>
                </div>
              ) : (
                <div className="field">
                  <label htmlFor="reasoning-effort">Reasoning effort</label>
                  <select
                    id="reasoning-effort"
                    value={apiConfig.reasoningEffort}
                    onChange={(event) =>
                      handleApiConfigChange({ reasoningEffort: event.target.value })
                    }
                  >
                    {REASONING_EFFORT_OPTIONS.map((option) => (
                      <option key={option.value || 'default'} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <small className="helper">
                    OpenAI reasoning models accept a reasoning effort level.
                  </small>
                </div>
              )}
              <div className="field">
                <label htmlFor="json-params">JSON params</label>
                <textarea
                  id="json-params"
                  rows={4}
                  value={apiConfig.paramsJson}
                  onChange={(event) => handleApiConfigChange({ paramsJson: event.target.value })}
                  placeholder='{"temperature":0.2,"max_tokens":1000}'
                />
                <small
                  className={`helper ${paramsValidation.isValid ? '' : 'validation-warning'}`}
                >
                  {paramsValidation.message} Values are merged into the request body and override
                  defaults.
                </small>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="settings-section">
        <button
          type="button"
          className="collapse-toggle"
          onClick={() => setWordPacksExpanded((prev) => !prev)}
        >
          <span className="toggle-icon">{wordPacksExpanded ? '▼' : '▶'}</span>
          <h3 style={{ display: 'inline', margin: 0 }}>Customize Word Packs</h3>
        </button>
        {wordPacksExpanded && (
          <div className="collapsible-content">
            <form className="stack" onSubmit={handlePackSubmit}>
              <div className="field">
                <label htmlFor="pack-name">Pack name</label>
                <input
                  id="pack-name"
                  value={packForm.name}
                  onChange={(event) => setPackForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Custom Pack"
                />
              </div>
              <div className="field">
                <label htmlFor="pack-words">Words (comma or newline separated)</label>
                <textarea
                  id="pack-words"
                  rows={4}
                  value={packForm.words}
                  onChange={(event) => setPackForm((prev) => ({ ...prev, words: event.target.value }))}
                  placeholder="Add at least 25 words..."
                />
                <small>{packWordCount} words entered.</small>
              </div>
              <div className="settings-actions">
                <button type="submit" className="primary">
                  {packForm.id ? 'Update pack' : 'Create pack'}
                </button>
                {packForm.id && (
                  <button type="button" onClick={handlePackReset}>
                    Cancel
                  </button>
                )}
              </div>
            </form>
            <div className="field">
              <label htmlFor="pack-upload">Upload custom CSV</label>
              <input id="pack-upload" type="file" accept=".csv" onChange={onCsvUpload} />
            </div>
            {customPacks.length > 0 ? (
              <div className="settings-list">
                {customPacks.map((pack) => (
                  <div key={pack.id} className="settings-item">
                    <div>
                      <strong>{pack.name}</strong>
                      <div className="meta">
                        {pack.words.length} words · ID: {pack.id}
                      </div>
                    </div>
                    <div className="settings-actions">
                      <button type="button" onClick={() => handlePackEdit(pack)}>
                        Edit
                      </button>
                      <button type="button" onClick={() => onDeletePack(pack.id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="helper">No custom packs yet.</p>
            )}
          </div>
        )}
      </div>

      <div className="settings-section">
        <button
          type="button"
          className="collapse-toggle"
          onClick={() => setPersonasExpanded((prev) => !prev)}
        >
          <span className="toggle-icon">{personasExpanded ? '▼' : '▶'}</span>
          <h3 style={{ display: 'inline', margin: 0 }}>Personas</h3>
        </button>
        {personasExpanded && (
          <div className="collapsible-content">
            {Object.keys(ROLE_LABELS).map((role) => (
              <div key={role} className="field">
                <label htmlFor={`${role}-persona`}>{ROLE_LABELS[role]} persona</label>
                <select
                  id={`${role}-persona`}
                  value={selectedPersonas[role] ?? ''}
                  onChange={(event) => onSelectPersona(role, event.target.value)}
                >
                  {personaOptions[role].map((persona) => (
                    <option key={persona.id} value={persona.id}>
                      {persona.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            <p className="helper">
              Your AI receives the board as JSON along with prior clues and guesses plus the
              selected persona prompt.
            </p>

            <form className="stack" onSubmit={handlePersonaSubmit}>
              <div className="field">
                <label htmlFor="persona-role">Persona role</label>
                <select
                  id="persona-role"
                  value={personaForm.role}
                  onChange={(event) =>
                    setPersonaForm((prev) => ({ ...prev, role: event.target.value }))
                  }
                >
                  {Object.keys(ROLE_LABELS).map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="persona-label">Label</label>
                <input
                  id="persona-label"
                  value={personaForm.label}
                  onChange={(event) =>
                    setPersonaForm((prev) => ({ ...prev, label: event.target.value }))
                  }
                  placeholder="Aggressive"
                />
              </div>
              <div className="field">
                <label htmlFor="persona-prompt">Prompt</label>
                <textarea
                  id="persona-prompt"
                  rows={4}
                  value={personaForm.prompt}
                  onChange={(event) =>
                    setPersonaForm((prev) => ({ ...prev, prompt: event.target.value }))
                  }
                  placeholder="Describe how your AI should behave..."
                />
              </div>
              <div className="settings-actions">
                <button type="submit" className="primary">
                  {personaForm.id ? 'Update persona' : 'Create persona'}
                </button>
                {personaForm.id && (
                  <button type="button" onClick={handlePersonaReset}>
                    Cancel
                  </button>
                )}
              </div>
            </form>
            <div className="settings-list">
              {personas.map((persona) => (
                <div key={persona.id} className="settings-item">
                  <div>
                    <strong>{persona.label}</strong>
                    <div className="meta">
                      {ROLE_LABELS[persona.role]} · ID: {persona.id} ·{' '}
                      {persona.prompt.slice(0, 80)}
                      {persona.prompt.length > 80 ? '…' : ''}
                    </div>
                  </div>
                  <div className="settings-actions">
                    <button type="button" onClick={() => handlePersonaEdit(persona)}>
                      Edit
                    </button>
                    <button type="button" onClick={() => onDeletePersona(persona.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {statusMessage ? <div className="status">{statusMessage}</div> : null}
    </section>
  );
};

export default Settings;
