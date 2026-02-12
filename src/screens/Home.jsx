import { Link } from 'react-router-dom';

const Home = () => (
  <main className="home">
    <section className="panel home-panel">
      <h2>Welcome to Monames</h2>
      <p className="subtitle">
        Set up a new match or tweak your Claude settings before you play.
      </p>
      <div className="home-actions">
        <Link className="button-link primary" to="/setup">
          New Game
        </Link>
        <Link className="button-link secondary" to="/settings">
          Settings
        </Link>
      </div>
    </section>
  </main>
);

export default Home;
