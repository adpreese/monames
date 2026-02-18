/**
 * Board component - renders the 5x5 grid of cards
 */
const Board = ({ cards, showTeams, onReveal, disabled, selectedCardId }) => (
  <div className={`board ${showTeams ? 'spymaster-view' : ''}`}>
    {cards.map((card) => {
      const revealedClass = card.revealed ? 'revealed' : 'hidden';
      const teamClass = showTeams || card.revealed ? `team-${card.team}` : '';
      const selectingClass = selectedCardId === card.id ? 'selecting' : '';
      const isCorrectGuess = card.revealed && card.revealedBy && card.team === card.revealedBy;
      const isWrongGuess = card.revealed && card.revealedBy && card.team !== card.revealedBy;
      return (
        <button
          key={card.id}
          className={`card ${revealedClass} ${teamClass} ${selectingClass}`}
          onClick={() => onReveal?.(card.id)}
          disabled={disabled}
          type="button"
        >
          <span>{card.word}</span>
          {showTeams && !card.revealed && (
            <span className="role-chip">{card.team}</span>
          )}
          {card.revealed && (
            <span className={`guess-indicator ${isCorrectGuess ? 'correct' : isWrongGuess ? 'wrong' : ''}`}>
              {isCorrectGuess ? '✓' : isWrongGuess ? '✗' : ''}
            </span>
          )}
        </button>
      );
    })}
  </div>
);

export default Board;
