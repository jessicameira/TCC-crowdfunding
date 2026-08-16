type IconProps = {
  name: string;
  className?: string;
  filled?: boolean;
};

function Icon({ name, className = '', filled = false }: IconProps) {
  return (
    <span className={`material-symbols-outlined ${filled ? 'fill-1' : ''} ${className}`}>
      {name}
    </span>
  );
}

export default Icon;
