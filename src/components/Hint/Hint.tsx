import './Hint.css';

export default function Hint({ text }: { text: string }) {
  return <div className={`hint${text ? '' : ' off'}`}>{text}</div>;
}
