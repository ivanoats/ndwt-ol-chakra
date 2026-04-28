import { css } from 'styled-system/css';

export default function Hero() {
  return (
    <section
      className={css({
        paddingX: { base: '4', md: '6' },
        paddingY: { base: '4', md: '5' },
        backgroundColor: 'bg.subtle',
        borderBottomWidth: '1px',
        borderColor: 'gray.6',
      })}
    >
      <div
        className={css({
          maxWidth: '5xl',
          marginX: 'auto',
          textAlign: { base: 'center', md: 'left' },
        })}
      >
        <h1
          className={css({
            margin: 0,
            fontSize: { base: 'xl', md: '2xl' },
            fontWeight: 'bold',
            color: 'fg.default',
            colorPalette: 'green',
            '& strong': { color: 'colorPalette.11' },
          })}
        >
          A <strong>367-mile</strong> recreational boating route from{' '}
          <strong>Canoe Camp</strong> on the Clearwater River to{' '}
          <strong>Bonneville Dam</strong> in the Columbia River Gorge.
        </h1>
        <p
          className={css({
            marginTop: '2',
            marginBottom: 0,
            fontSize: { base: 'sm', md: 'md' },
            color: 'fg.muted',
            maxWidth: '3xl',
            marginX: { base: 'auto', md: 0 },
          })}
        >
          Click any marker to see launch sites, facilities, and contact info, or
          download the waypoint as a GPX file.
        </p>
      </div>
    </section>
  );
}
