export const QuestGraphMinimapNode: React.FunctionComponent<{
  x: number;
  y: number;
}> = ({ x, y }) => {
  const size = 100;
  const points = [
    [x + 0.5 * size, y],
    [x + size, y + 0.25 * size],
    [x + size, y + 0.75 * size],
    [x + 0.5 * size, y + size],
    [x, y + 0.75 * size],
    [x, y + 0.25 * size],
  ];
  return (
    <polygon
      points={points.map(([x, y]) => `${x} ${y}`).join(",")}
      stroke="black"
      fill="white"
      strokeWidth="2"
    />
  );
};
