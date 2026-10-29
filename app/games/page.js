import Widget from '@/components/Widget';
import DailyPuzzle from '@/components/DailyPuzzle';
import Jumble from '@/components/Jumble';
import HigherLower from '@/components/HigherLower';
import LogoQuiz from '@/components/LogoQuiz';
import { getMeta } from '@/lib/meta';
import { buildGames } from '@/lib/games';

export const revalidate = 300;
export const maxDuration = 60;
export const metadata = { title: 'Games' };

export default async function Games() {
  const meta = await getMeta();
  const g = buildGames(meta.runners, meta.stats.themes);
  const date = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'America/New_York' });
  return (
    <div className="board-app">
      <header className="page-head">
        <h1>Games</h1>
        <p className="muted">The daily puzzles for {date}, built from today&apos;s runners. New ones every midnight ET.</p>
      </header>
      <div className="row row-games">
        {g.ticker && (
          <Widget title="Daily ticker" note="guess today's runner" className="wg-game wg-game-wide">
            <DailyPuzzle day={g.day} {...g.ticker} />
          </Widget>
        )}
        {g.jumble && (
          <Widget id="jumble" title="The Jumble" note="unscramble the coin" className="wg-game">
            <Jumble day={g.day} data={g.jumble} />
          </Widget>
        )}
        <Widget id="higher" title="Higher or lower" note="which cap is bigger" className="wg-game">
          <HigherLower day={g.day} pairs={g.hl} />
        </Widget>
        <Widget id="logo" title="Name that logo" note="six logos" className="wg-game">
          <LogoQuiz day={g.day} rounds={g.logos} />
        </Widget>
      </div>
    </div>
  );
}
