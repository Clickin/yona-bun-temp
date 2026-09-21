/* oxlint-disable jsx-a11y/prefer-tag-over-role -- legacy Select2/Bootstrap parity DOM intentionally keeps role-based controls. */
import { useRef, useState } from "react";
import { useLegacyMessages } from "../../i18n";

type ProjectChoice = { projectName: string; logoUrl?: string };

export function OrganizationProjectPicker({
  projects,
  value,
  onChange,
  variant = "plain",
}: {
  projects: ProjectChoice[];
  value: string[];
  onChange: (value: string[], form: HTMLFormElement) => void;
  variant?: "plain" | "projects";
}) {
  const { t } = useLegacyMessages();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const normalizedQuery = query.toLocaleLowerCase();
  const matches = projects.filter(
    (project) =>
      !value.includes(project.projectName) &&
      project.projectName.toLocaleLowerCase().includes(normalizedQuery),
  );
  const activeProject = matches[Math.min(activeIndex, matches.length - 1)];
  const choose = (next: string[]) => {
    const form = inputRef.current?.form;
    if (!form) return;
    inputRef.current?.focus();
    setQuery("");
    setOpen(false);
    setActiveIndex(0);
    onChange(next, form);
  };
  const projectLabel = (project: ProjectChoice) =>
    variant === "projects" ? (
      <div className="usf-group" title={project.projectName}>
        {project.logoUrl && !project.logoUrl.includes("project_default_logo.png") ? (
          <span className="avatar-wrap smaller">
            <img alt="" src={project.logoUrl} width="16" height="16" />
          </span>
        ) : (
          <span className="width25px" />
        )}
        <span className="loginid" />
        <span className="name">{project.projectName}</span>
      </div>
    ) : (
      project.projectName
    );

  return (
    <div
      className={`select2-container select2-container-multi fullsize${open ? " select2-container-active select2-dropdown-open" : ""}`}
      data-owner="organization-project-picker"
      id="projects"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
          setQuery("");
        }
      }}
    >
      {value.map((name) => (
        <input key={name} type="hidden" name="projectNames[]" value={name} />
      ))}
      <ul className="select2-choices">
        {value.map((name) => (
          <li className="select2-search-choice" key={name}>
            <div>
              {projectLabel(
                projects.find((project) => project.projectName === name) ?? { projectName: name },
              )}
            </div>
            <button
              aria-label={`${t("button.delete")}: ${name}`}
              className="select2-search-choice-close"
              data-owner="organization-project-picker-choice-remove"
              onClick={() => choose(value.filter((selected) => selected !== name))}
              type="button"
            />
          </li>
        ))}
        <li className="select2-search-field">
          <input
            aria-activedescendant={
              open && activeProject
                ? `project-choice-${encodeURIComponent(activeProject.projectName)}`
                : undefined
            }
            aria-autocomplete="list"
            aria-controls="project-choices"
            aria-expanded={open}
            aria-label={t("organization.choose.projects")}
            autoComplete="off"
            className={`select2-input${value.length === 0 && query === "" ? " select2-default" : ""}`}
            data-owner="organization-project-picker-search"
            onChange={(event) => {
              setQuery(event.currentTarget.value);
              setActiveIndex(0);
              setOpen(true);
            }}
            onClick={() => setOpen(true)}
            onFocus={() => setOpen(true)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                setOpen(false);
                setQuery("");
              } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                setOpen(true);
                setActiveIndex((index) =>
                  open
                    ? Math.max(
                        0,
                        Math.min(matches.length - 1, index + (event.key === "ArrowDown" ? 1 : -1)),
                      )
                    : 0,
                );
              } else if (event.key === "Enter") {
                event.preventDefault();
                if (open && activeProject) choose([...value, activeProject.projectName]);
                else setOpen(true);
              }
            }}
            placeholder={value.length === 0 ? t("organization.choose.projects") : undefined}
            ref={inputRef}
            role="combobox"
            type="text"
            value={query}
          />
        </li>
      </ul>
      {open ? (
        <div
          className="select2-drop select2-drop-multi select2-drop-active"
          data-owner="organization-project-picker-results"
        >
          <ul
            className="select2-results"
            id="project-choices"
            role="listbox"
            aria-label={t("organization.choose.projects")}
          >
            {matches.map((project, index) => (
              <li
                className={`select2-result select2-result-selectable${project === activeProject ? " select2-highlighted" : ""}`}
                key={project.projectName}
                role="presentation"
              >
                <button
                  aria-selected={project === activeProject}
                  className="select2-result-label"
                  data-owner="organization-project-picker-option"
                  id={`project-choice-${encodeURIComponent(project.projectName)}`}
                  onClick={() => choose([...value, project.projectName])}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  role="option"
                  tabIndex={-1}
                  type="button"
                >
                  {projectLabel(project)}
                </button>
              </li>
            ))}
            {matches.length === 0 ? (
              <li className="select2-no-results" role="presentation">
                {t("select2.noMatches")}
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
