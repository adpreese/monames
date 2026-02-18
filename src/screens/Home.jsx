import { Link } from 'react-router-dom';

const Home = ({ hasApiKey }) => (
  <main className="home">
    <section className="panel home-panel">
      <h2>Welcome to Monames</h2>
      <p>
        Monames is a browser-based Codenames variant where an LLM plays as spymaster or guesser with humans taking the other side of each team.
      </p>
      <p>
        You bring your own API key. Calls are made directly from your browser to the provider
        (Anthropic, OpenAI, or a custom endpoint) — your key is never sent to or stored on any
        server. It is saved only in your browser's local storage. An average game with Opus 4.6
        costs about a quarter
      </p>
      <div className="home-actions">
        {hasApiKey && (
          <Link className="button-link primary" to="/setup">
            New Game
          </Link>
        )}
        <Link className={`button-link${hasApiKey ? ' secondary' : ' attention'}`} to="/settings">
          Settings
        </Link>
      </div>
    </section>
  </main>
);

export default Home;
