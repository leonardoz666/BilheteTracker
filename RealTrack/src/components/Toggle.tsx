interface ToggleProps {
  checked?: boolean;
  onClick?: () => void;
}

export default function Toggle({ checked = false, onClick }: ToggleProps) {
  return (
    <button
      type="button"
      className={`toggle ${checked ? 'active' : ''}`}
      onClick={onClick}
    />
  );
}

