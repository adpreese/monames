const setupFields = [
  { team: 'red', role: 'guesser', label: 'Red Team Guesser' },
  { team: 'red', role: 'spymaster', label: 'Red Team Spymaster' },
  { team: 'blue', role: 'guesser', label: 'Blue Team Guesser' },
  { team: 'blue', role: 'spymaster', label: 'Blue Team Spymaster' }
];

const NewGameSetup = ({
  packs,
  selectedPackId,
  onSelectPack,
  roleControl,
  onRoleChange,
  personaOptions,
  isValidSetup,
  onStartGame,
  statusMessage
}) => (
  <main className="setup-screen">
    <section className="panel setup-panel">
      <h2>New game setup</h2>
      <p className="subtitle">Choose who plays each role before starting.</p>

      <div className="field">
        <label htmlFor="setup-pack">Word pack</label>
        <select
          id="setup-pack"
          value={selectedPackId}
          onChange={(event) => onSelectPack(event.target.value)}
        >
          {packs.map((pack) => (
            <option key={pack.id} value={pack.id}>
              {pack.name}
            </option>
          ))}
        </select>
      </div>

      <div className="setup-grid">
        {setupFields.map(({ team, role, label }) => (
          <div key={`${team}-${role}`} className="field">
            <label htmlFor={`setup-${team}-${role}`}>{label}</label>
            <select
              id={`setup-${team}-${role}`}
              value={roleControl[team]?.[role] ?? 'human'}
              onChange={(event) => onRoleChange(team, role, event.target.value)}
            >
              <option value="human">Human</option>
              {personaOptions?.[role]?.length ? (
                <optgroup label="AI personas">
                  {personaOptions[role].map((persona) => (
                    <option key={persona.id} value={persona.id}>
                      {persona.label}
                    </option>
                  ))}
                </optgroup>
              ) : null}
            </select>
          </div>
        ))}
      </div>

      <p className={`helper ${isValidSetup ? '' : 'validation-warning'}`}>
        Valid setups require all Guessers to be Human and all Spymasters to be an LLM,
        or vice versa.
      </p>
      {statusMessage ? <div className="status">{statusMessage}</div> : null}

      <div className="setup-actions">
        <button
          type="button"
          className="primary"
          disabled={!isValidSetup}
          onClick={onStartGame}
        >
          Next
        </button>
      </div>
    </section>
  </main>
);

export default NewGameSetup;
