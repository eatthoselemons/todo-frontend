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
          <div className="overlay-dark" onClick={() => setShowMenu(false)} />
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed",
              top: `${buttonRef.getBoundingClientRect().bottom + 4}px`,
              left: `${buttonRef.getBoundingClientRect().left}px`,
              zIndex: 1002
            }}
          >
            <div className="modal-header">
              <div className="modal-title">Density Options</div>
              <div className="spacer"></div>
              <span
                className="muted modal-close"
                onClick={() => setShowMenu(false)}
              >
                ✕
              </span>
            </div>
            <div className="modal-description">
              Choose how to display the task tree.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <button
                className="btn"
                onClick={() => {
                  onExpandAll();
                  setShowMenu(false);
                }}
              >
                Expand all
              </button>
              <button
                className="btn"
                onClick={() => {
                  onCollapseAll();
                  setShowMenu(false);
                }}
              >
                Collapse all
              </button>
              <button
                className="btn"
                onClick={() => {
                  setShowLevelModal(true);
                  setShowMenu(false);
                }}
              >
                Expand to level…
              </button>
            </div>
          </div>
        </>
      )}

      {showLevelModal && buttonRef && (
        <>
          <div className="overlay-dark" onClick={() => setShowLevelModal(false)} />
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed",
              top: `${buttonRef.getBoundingClientRect().bottom + 4}px`,
              left: `${buttonRef.getBoundingClientRect().left}px`,
              zIndex: 1002
            }}
          >
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
        </>
      )}
    </>
  );
};

export default DensityMenu;