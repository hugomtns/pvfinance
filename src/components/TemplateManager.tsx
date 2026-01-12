import { useState, useRef } from 'react';
import type { CostLineItem, CostTemplate } from '../types';
import { useTemplates } from '../hooks/useLocalStorage';
import { Modal } from './Modal';
import '../styles/LineItems.css';

interface TemplateManagerProps {
  capexItems: CostLineItem[];
  opexItems: CostLineItem[];
  globalMargin: number;
  onLoadTemplate: (template: CostTemplate) => void;
}

export function TemplateManager({
  capexItems,
  opexItems,
  globalMargin,
  onLoadTemplate
}: TemplateManagerProps) {
  const {
    templates,
    saveTemplate,
    deleteTemplate,
    exportTemplate,
    importTemplate,
    exportAllTemplates,
    importAllTemplates
  } = useTemplates();

  const [showTemplateList, setShowTemplateList] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateCategory, setTemplateCategory] = useState('');

  // Modal states
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'alert' | 'confirm';
    onConfirm?: () => void;
    confirmButtonStyle?: 'primary' | 'danger' | 'success';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'alert'
  });

  const importFileInputRef = useRef<HTMLInputElement>(null);
  const importAllFileInputRef = useRef<HTMLInputElement>(null);

  const showAlert = (title: string, message: string) => {
    setModalState({
      isOpen: true,
      title,
      message,
      type: 'alert'
    });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void, confirmButtonStyle: 'primary' | 'danger' | 'success' = 'primary') => {
    setModalState({
      isOpen: true,
      title,
      message,
      type: 'confirm',
      onConfirm,
      confirmButtonStyle
    });
  };

  const closeModal = () => {
    setModalState({
      isOpen: false,
      title: '',
      message: '',
      type: 'alert'
    });
  };

  const handleSaveTemplate = () => {
    if (!templateName.trim()) {
      showAlert('Validation Error', 'Please enter a template name');
      return;
    }

    try {
      saveTemplate({
        name: templateName.trim(),
        description: templateDescription.trim() || undefined,
        category: templateCategory.trim() || undefined,
        capex_items: capexItems,
        opex_items: opexItems,
        global_margin: globalMargin,
        version: 1
      });

      showAlert('Success', `Template "${templateName}" saved successfully!`);
      setShowSaveDialog(false);
      setTemplateName('');
      setTemplateDescription('');
      setTemplateCategory('');
    } catch (err) {
      if (err instanceof Error) {
        showAlert('Error', `Failed to save template: ${err.message}`);
      }
    }
  };

  const handleDeleteTemplate = (id: string, name: string) => {
    showConfirm(
      'Delete Template',
      `Are you sure you want to delete template "${name}"?`,
      () => deleteTemplate(id),
      'danger'
    );
  };

  const handleExportTemplate = (id: string, name: string) => {
    try {
      const json = exportTemplate(id);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name.replace(/[^a-z0-9]/gi, '_')}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      if (err instanceof Error) {
        showAlert('Export Error', `Export failed: ${err.message}`);
      }
    }
  };

  const handleImportTemplate = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = e.target?.result as string;
        importTemplate(json);
        showAlert('Success', 'Template imported successfully!');
      } catch (err) {
        if (err instanceof Error) {
          showAlert('Import Error', `Import failed: ${err.message}`);
        }
      }
    };
    reader.readAsText(file);

    // Reset input so same file can be imported again
    event.target.value = '';
  };

  const handleExportAll = () => {
    try {
      const json = exportAllTemplates();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pvfinance_templates_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      if (err instanceof Error) {
        showAlert('Export Error', `Export failed: ${err.message}`);
      }
    }
  };

  const handleImportAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = e.target?.result as string;
        importAllTemplates(json);
        showAlert('Success', 'Templates imported successfully!');
      } catch (err) {
        if (err instanceof Error) {
          showAlert('Import Error', `Import failed: ${err.message}`);
        }
      }
    };
    reader.readAsText(file);

    // Reset input so same file can be imported again
    event.target.value = '';
  };

  const formatDate = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="template-manager">
      {/* Header */}
      <div
        className="template-header"
        onClick={() => setShowTemplateList(!showTemplateList)}
      >
        <div>
          <span style={{ fontWeight: 600 }}>Templates</span>
          {templates.length > 0 && (
            <span className="template-badge">{templates.length}</span>
          )}
        </div>
        <span>{showTemplateList ? '▲' : '▼'}</span>
      </div>

      {/* Expanded content */}
      {showTemplateList && (
        <>
          {/* Actions */}
          <div className="template-actions">
            <button
              type="button"
              className="template-btn template-btn-primary"
              onClick={() => setShowSaveDialog(true)}
            >
              Save Current as Template
            </button>
            <button
              type="button"
              className="template-btn"
              onClick={() => importFileInputRef.current?.click()}
            >
              Import Template
            </button>
            <input
              ref={importFileInputRef}
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleImportTemplate}
            />
            {templates.length > 0 && (
              <>
                <button
                  type="button"
                  className="template-btn"
                  onClick={handleExportAll}
                >
                  Export All Templates
                </button>
                <button
                  type="button"
                  className="template-btn"
                  onClick={() => importAllFileInputRef.current?.click()}
                >
                  Import Multiple
                </button>
                <input
                  ref={importAllFileInputRef}
                  type="file"
                  accept=".json"
                  style={{ display: 'none' }}
                  onChange={handleImportAll}
                />
              </>
            )}
          </div>

          {/* Template list */}
          {templates.length > 0 ? (
            <div className="template-list">
              {templates.map((template) => {
                return (
                  <div key={template.id} className="template-card">
                    <div className="template-info">
                      <div className="template-name">{template.name}</div>
                      {template.description && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>
                          {template.description}
                        </div>
                      )}
                      <div className="template-meta">
                        {template.capex_items.length} CAPEX, {template.opex_items.length} OPEX items
                        {' • '}
                        Updated: {formatDate(template.updated_at)}
                      </div>
                    </div>
                    <div className="template-card-actions">
                      <button
                        type="button"
                        className="template-btn template-btn-primary"
                        onClick={() => onLoadTemplate(template)}
                      >
                        Load
                      </button>
                      <button
                        type="button"
                        className="template-btn"
                        onClick={() => handleExportTemplate(template.id, template.name)}
                      >
                        Export
                      </button>
                      <button
                        type="button"
                        className="template-btn template-btn-danger"
                        onClick={() => handleDeleteTemplate(template.id, template.name)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: 'var(--spacing-md)', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
              No templates saved yet. Save your current cost breakdown to create a template.
            </div>
          )}
        </>
      )}

      {/* Save Dialog Modal */}
      {showSaveDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: 'var(--spacing-lg)',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: 'var(--spacing-md)' }}>Save Template</h3>

            <div style={{ marginBottom: 'var(--spacing-md)' }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500, fontSize: '0.875rem' }}>
                Template Name <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., Standard Solar Project 300MW"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: '4px',
                  fontSize: '0.875rem'
                }}
                autoFocus
              />
            </div>

            <div style={{ marginBottom: 'var(--spacing-md)' }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500, fontSize: '0.875rem' }}>
                Description (optional)
              </label>
              <textarea
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Add notes about this template"
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: '4px',
                  fontSize: '0.875rem',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500, fontSize: '0.875rem' }}>
                Category (optional)
              </label>
              <input
                type="text"
                value={templateCategory}
                onChange={(e) => setTemplateCategory(e.target.value)}
                placeholder="e.g., Solar, Wind, Hybrid"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: '4px',
                  fontSize: '0.875rem'
                }}
              />
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-md)' }}>
              This template will include:
              <ul style={{ marginTop: '0.5rem', marginBottom: 0, paddingLeft: '1.5rem' }}>
                <li>{capexItems.length} CAPEX items</li>
                <li>{opexItems.length} OPEX items</li>
                <li>Global margin: {globalMargin}%</li>
              </ul>
            </div>

            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="template-btn"
                onClick={() => {
                  setShowSaveDialog(false);
                  setTemplateName('');
                  setTemplateDescription('');
                  setTemplateCategory('');
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="template-btn template-btn-primary"
                onClick={handleSaveTemplate}
                disabled={!templateName.trim()}
              >
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for alerts and confirmations */}
      <Modal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
        showCancel={modalState.type === 'confirm'}
        onConfirm={modalState.type === 'confirm' ? modalState.onConfirm : undefined}
        confirmButtonStyle={modalState.confirmButtonStyle}
      >
        {modalState.message}
      </Modal>
    </div>
  );
}
