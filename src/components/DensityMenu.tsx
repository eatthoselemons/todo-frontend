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

  return (
    <>
      <button className="btn" onClick={() => setShowMenu(!showMenu)}>
        Density
      </button>

      {showMenu && (
        <>
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999,
            }}
            onClick={() => setShowMenu(false)}
          />
          <div
            style={{
              position: "absolute",
              top: "60px",
              right: "20px",
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

      {showLevelModal && (
        <>
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.5)",
              zIndex: 1001,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={() => setShowLevelModal(false)}
          >
            <div
              className="modal-card"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: "420px" }}
            >
              <div className="row" style={{ alignItems: "center" }}>
                <div className="modal-title">Expand to level</div>
                <div className="spacer"></div>
                <span
                  className="muted"
                  style={{ cursor: "pointer" }}
                  onClick={() => setShowLevelModal(false)}
                >
                  ✕
                </span>
              </div>
              <div className="level-grid" style={{ marginTop: "8px" }}>
                {[1, 2, 3, 4, 5].map((level) => (
                  <div
                    key={level}
                    className="level-btn"
                    onClick={() => {
                      onExpandToLevel(level);
                      setShowLevelModal(false);
                    }}
                  >
                    {level}
                  </div>
                ))}
                <div
                  className="level-btn"
                  onClick={() => {
                    onExpandAll();
                    setShowLevelModal(false);
                  }}
                >
                  All
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default DensityMenu;