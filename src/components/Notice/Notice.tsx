import './Notice.css';

export default function Notice({ text }: { text: string }) {
  if (!text) return null;
  return <div className="notice"><span>{text}</span></div>;
}
