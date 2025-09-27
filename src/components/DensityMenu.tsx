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
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999,
              background: "transparent",
            }}
            onClick={() => setShowMenu(false)}
          />
          <div
            style={{
              position: "fixed",
              top: `${buttonRef.getBoundingClientRect().bottom + 4}px`,
              left: window.innerWidth < 768 ? "50%" : `${buttonRef.getBoundingClientRect().left}px`,
              transform: window.innerWidth < 768 ? "translateX(-50%)" : "none",
              zIndex: 1000,
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
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1001,
            }}
            onClick={() => setShowLevelModal(false)}
          />
          <div
            style={{
              position: "fixed",
              top: `${buttonRef.getBoundingClientRect().bottom + 4}px`,
              left: `${buttonRef.getBoundingClientRect().left}px`,
              zIndex: 1002,
            }}
          >
            <div
              className="modal-card"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: "420px", minWidth: "320px" }}
            >
              <div className="row" style={{ alignItems: "center", marginBottom: "16px" }}>
                <div className="modal-title">Expand to level</div>
                <div className="spacer"></div>
                <span
                  className="muted"
                  style={{ cursor: "pointer", fontSize: "20px" }}
                  onClick={() => setShowLevelModal(false)}
                >
                  ✕
                </span>
              </div>
              <div style={{ marginBottom: "16px", fontSize: "13px", color: "var(--muted)" }}>
                Choose how many levels of the tree to expand. First click selects and closes.
              </div>
              <div className="level-grid" style={{ marginTop: "8px" }}>
                {[1, 2, 3, 4, 5].map((level) => (
                  <button
                    key={level}
                    className="btn"
                    style={{ padding: "12px" }}
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
                  style={{ padding: "12px" }}
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