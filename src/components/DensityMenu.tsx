import React, { useState } from "react";

interface DensityMenuProps {
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onExpandToLevel: (level: number) => void;
}

const DensityMenu: React.FC<DensityMenuProps> = ({
  onExpandAll,
  onCollapseAll,
  onExpandToLevel,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [buttonRef, setButtonRef] = React.useState<HTMLButtonElement | null>(null);

  return (
    <>
      <button
        ref={setButtonRef}
        className="btn"
        onClick={() => setShowMenu(!showMenu)}
      >
        Density
      </button>

      {showMenu && buttonRef && (
        <>
          <div className="overlay" onClick={() => setShowMenu(false)} />
          <div
            className="popover-container"
            style={{
              top: `${buttonRef.getBoundingClientRect().bottom + 4}px`,
              left: window.innerWidth < 768 ? "50%" : `${buttonRef.getBoundingClientRect().left}px`,
              transform: window.innerWidth < 768 ? "translateX(-50%)" : "none",
            }}
          >
            <div className="popover">
              <div
                className="item"
                onClick={() => {
                  onExpandAll();
                  setShowMenu(false);
                }}
              >
                Expand all
              </div>
              <div
                className="item"
                onClick={() => {
                  onCollapseAll();
                  setShowMenu(false);
                }}
              >
                Collapse all
              </div>
              <div
                className="item"
                onClick={() => {
                  setShowLevelModal(true);
                  setShowMenu(false);
                }}
              >
                Expand to level…
              </div>
            </div>
          </div>
        </>
      )}

      {showLevelModal && buttonRef && (
        <>
          <div className="overlay" onClick={() => setShowLevelModal(false)} style={{ zIndex: 1001 }} />
          <div
            className="modal-container"
            style={{
              top: `${buttonRef.getBoundingClientRect().bottom + 4}px`,
              left: `${buttonRef.getBoundingClientRect().left}px`,
            }}
          >
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-title">Expand to level</div>
                <div className="spacer"></div>
                <span
                  className="muted modal-close"
                  onClick={() => setShowLevelModal(false)}
                >
                  ✕
                </span>
              </div>
              <div className="modal-description">
                Choose how many levels of the tree to expand. First click selects and closes.
              </div>
              <div className="level-grid">
                {[1, 2, 3, 4, 5].map((level) => (
                  <button
                    key={level}
                    className="btn"
                    onClick={() => {
                      onExpandToLevel(level);
                      setShowLevelModal(false);
                    }}
                  >
                    {level}
                  </button>
                ))}
                <button
                  className="btn"
                  onClick={() => {
                    onExpandAll();
                    setShowLevelModal(false);
                  }}
                >
                  All
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default DensityMenu;