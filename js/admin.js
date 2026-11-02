
(() => {
    const client = supabase.createClient(
        window.SUPABASE_URL,
        window.SUPABASE_ANON_KEY
    );

    const $ = id => document.getElementById(id);

    let section = 'projects';
    let editing = null;

    // ==========================================
    // SECTION CONFIGURATION
    // Table names and columns match the SQL schema
    // ==========================================

    const config = {
        projects: {
            title: 'Projects',
            table: 'projects',
            bucket: 'project-media',
            hint: 'Manage projects shown on your portfolio.',
            fields: [
                ['title', 'Project title', 'text', true],
                ['slug', 'URL slug', 'text', true],
                ['description', 'Description', 'textarea'],
                ['category', 'Category', 'text'],
                ['technologies', 'Technologies (comma separated)', 'list'],
                ['thumbnail_url', 'Thumbnail image', 'file'],
                ['gallery_urls', 'Gallery images', 'files'],
                ['github_url', 'GitHub URL', 'url'],
                ['live_demo_url', 'Live demo URL', 'url'],
                ['start_date', 'Start date', 'date'],
                ['featured', 'Featured project', 'checkbox'],
                ['status', 'Visibility', 'select', false, ['draft', 'published']]
            ]
        },

        certificates: {
            title: 'Certificates',
            table: 'certificates',
            bucket: 'certificate-media',
            hint: 'Manage certificates and credential links.',
            fields: [
                ['title', 'Certificate title', 'text', true],
                ['issuer', 'Issuing organization', 'text'],
                ['issue_date', 'Issue date', 'date'],
                ['credential_url', 'Verification URL', 'url'],
                ['description', 'Description', 'textarea'],
                ['file_url', 'Certificate image or PDF', 'file'],
                ['status', 'Visibility', 'select', false, ['draft', 'published']]
            ]
        },

        skills: {
            title: 'Skills',
            table: 'skills',
            hint: 'Manage skills displayed on your portfolio.',
            fields: [
                ['name', 'Skill name', 'text', true],
                ['category', 'Category', 'text'],
                ['proficiency', 'Proficiency / level', 'text'],
                ['sort_order', 'Display order', 'number']
            ]
        },

        resumes: {
            title: 'Resumes',
            table: 'resumes',
            bucket: 'resume-files',
            hint: 'Manage role-specific PDF resumes.',
            fields: [
                ['title', 'Resume title', 'text', true],
                ['role', 'Target role', 'text'],
                ['description', 'Description', 'textarea'],
                ['file_url', 'PDF file', 'file', true],
                ['is_primary', 'Primary resume', 'checkbox']
            ]
        },

        profile: {
            title: 'Home / About',
            table: 'portfolio_profile',
            bucket: 'profile-media',
            single: true,
            hint: 'Edit your public profile and home introduction.',
            fields: [
                ['name', 'Full name', 'text', true],
                ['professional_title', 'Professional title', 'text', true],
                ['profile_image_url', 'Profile photo', 'file'],
                ['short_intro', 'Short introduction', 'textarea'],
                ['about_text', 'About Me', 'textarea'],
                ['current_focus', 'Current learning and career focus', 'textarea'],
                ['career_objective', 'Career objective', 'textarea'],
                ['location', 'Location', 'text'],
                ['email', 'Email', 'text'],
                ['github_url', 'GitHub URL', 'url'],
                ['linkedin_url', 'LinkedIn URL', 'url'],
                ['status', 'Visibility', 'select', false, ['draft', 'published']]
            ]
        },

        education: {
            title: 'Education',
            table: 'portfolio_education',
            hint: 'Add and manage multiple education records.',
            fields: [
                ['degree', 'Degree / Course', 'text', true],
                ['institution', 'College / Institution', 'text', true],
                ['university', 'University', 'text'],
                ['location', 'Location', 'text'],
                ['start_date', 'Start date', 'date'],
                ['end_date', 'End date', 'date'],
                ['currently_studying', 'Currently studying', 'checkbox'],
                ['description', 'Description', 'textarea'],
                ['grade', 'CGPA / Grade', 'text'],
                ['sort_order', 'Display order', 'number'],
                ['status', 'Visibility', 'select', false, ['draft', 'published']]
            ]
        },

        experience: {
            title: 'Experience',
            table: 'portfolio_experience',
            bucket: 'profile-media',
            hint: 'Add internships and jobs. Enter verified experience only.',
            fields: [
                ['company_name', 'Company name', 'text', true],
                ['job_title', 'Job designation', 'text', true],
                ['employment_type', 'Employment type', 'select', false,
                    ['Internship', 'Full-time', 'Part-time', 'Freelance', 'Contract']],
                ['location', 'Location', 'text'],
                ['start_date', 'Start date', 'date'],
                ['end_date', 'End date', 'date'],
                ['currently_working', 'Currently working', 'checkbox'],
                ['description', 'Description', 'textarea'],
                ['responsibilities', 'Responsibilities (one per line)', 'lines'],
                ['technologies', 'Technologies (one per line)', 'lines'],
                ['company_logo_url', 'Company logo', 'file'],
                ['sort_order', 'Display order', 'number'],
                ['status', 'Visibility', 'select', false, ['draft', 'published']]
            ]
        },

        contact: {
            title: 'Contact',
            table: 'portfolio_contact',
            single: true,
            hint: 'Manage your public contact information.',
            fields: [
                ['email', 'Email', 'text'],
                ['phone', 'Phone', 'text'],
                ['location', 'Location', 'text'],
                ['linkedin_url', 'LinkedIn URL', 'url'],
                ['github_url', 'GitHub URL', 'url'],
                ['website_url', 'Website URL', 'url'],
                ['availability_text', 'Availability message', 'textarea'],
                ['status', 'Visibility', 'select', false, ['draft', 'published']]
            ]
        }
    };

    // ==========================================
    // HELPERS
    // ==========================================

    function msg(message, error = false) {
        if (!$('appMessage')) return;

        $('appMessage').textContent = message;
        $('appMessage').style.color = error ? '#f87171' : '#38bdf8';
    }

    const esc = value =>
        String(value ?? '').replace(/[&<>"']/g, char => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[char]));

    function getTitle(record) {
        return record.title ||
            record.name ||
            record.degree ||
            record.company_name ||
            record.email ||
            'Untitled';
    }

    // ==========================================
    // FILE UPLOAD
    // ==========================================

    async function upload(file, bucket) {
        if (!file) return null;

        if (!bucket) {
            throw new Error('Storage bucket is not configured.');
        }

        const path =
            `${Date.now()}-${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`;

        const { error } = await client.storage
            .from(bucket)
            .upload(path, file, {
                upsert: false,
                contentType: file.type
            });

        if (error) throw error;

        const { data } = client.storage
            .from(bucket)
            .getPublicUrl(path);

        return data.publicUrl;
    }

    // ==========================================
    // FORM FIELD GENERATOR
    // ==========================================

    function fieldHtml(field, value) {
        const [key, label, type, required = false, options = []] = field;

        const id = 'f-' + key;
        const current = value ?? '';

        if (type === 'checkbox') {
            return `
                <label class="check-row field full">
                    <input id="${id}" type="checkbox"
                    ${value ? 'checked' : ''}>
                    ${esc(label)}
                </label>
            `;
        }

        if (type === 'textarea' || type === 'lines') {
            const textValue = type === 'lines'
                ? Array.isArray(value) ? value.join('\n') : current
                : current;

            return `
                <label class="field full">
                    ${esc(label)}
                    <textarea id="${id}" ${required ? 'required' : ''}>${esc(textValue)}</textarea>
                </label>
            `;
        }

        if (type === 'select') {
            return `
                <label class="field">
                    ${esc(label)}
                    <select id="${id}">
                        ${options.map(option => `
                            <option value="${esc(option)}"
                            ${value === option ? 'selected' : ''}>
                                ${esc(option)}
                            </option>
                        `).join('')}
                    </select>
                </label>
            `;
        }

        if (type === 'file' || type === 'files') {
            const currentLink = value
                ? `<a href="${esc(value)}" target="_blank" rel="noopener">View current file</a>`
                : '';

            return `
                <label class="field full">
                    ${esc(label)}
                    <input
                        id="${id}"
                        type="file"
                        ${type === 'files' ? 'multiple' : ''}
                        accept="${key === 'file_url' ? '.pdf,image/*' : 'image/*'}"
                        ${required && !value ? 'required' : ''}
                    >
                    ${currentLink}
                </label>
            `;
        }

        const inputType = {
            date: 'date',
            number: 'number',
            url: 'url'
        }[type] || 'text';

        return `
            <label class="field">
                ${esc(label)}
                <input
                    id="${id}"
                    type="${inputType}"
                    value="${esc(current)}"
                    ${required ? 'required' : ''}
                >
            </label>
        `;
    }

    // ==========================================
    // OPEN EDITOR
    // ==========================================

    function openEditor(record = null) {
        editing = record;

        const cfg = config[section];

        $('editor').classList.remove('hidden');

        $('editor').innerHTML = `
            <h3>${record ? 'Edit' : 'Add'} ${esc(cfg.title)}</h3>

            <form id="recordForm">
                <div class="form-grid">
                    ${cfg.fields.map(field =>
                        fieldHtml(
                            field,
                            record?.[field[0]] ??
                            (field[0] === 'status' ? 'draft' : '')
                        )
                    ).join('')}
                </div>

                <div class="form-actions">
                    <button class="btn primary" type="submit">
                        Save ${esc(cfg.title)}
                    </button>

                    <button class="btn secondary" type="button" id="cancelEdit">
                        Cancel
                    </button>
                </div>
            </form>
        `;

        $('cancelEdit').onclick = () => {
            $('editor').classList.add('hidden');
            editing = null;
        };

        $('recordForm').onsubmit = saveRecord;
    }

    // ==========================================
    // COLLECT FORM DATA
    // ==========================================

    async function collectFormData(cfg) {
        const data = {};

        for (const [key, label, type] of cfg.fields) {
            const element = $('f-' + key);

            if (!element) continue;

            if (type === 'checkbox') {
                data[key] = element.checked;
                continue;
            }

            if (type === 'file') {
                const file = element.files[0];

                data[key] = file
                    ? await upload(file, cfg.bucket)
                    : (editing?.[key] ?? null);

                continue;
            }

            if (type === 'files') {
                const files = [...element.files];

                const uploaded = await Promise.all(
                    files.map(file => upload(file, cfg.bucket))
                );

                data[key] = [
                    ...(editing?.[key] || []),
                    ...uploaded
                ];

                continue;
            }

            if (type === 'number') {
                data[key] = Number(element.value || 0);
                continue;
            }

            if (type === 'list' || type === 'lines') {
                data[key] = element.value
                    .split(type === 'list' ? ',' : '\n')
                    .map(item => item.trim())
                    .filter(Boolean);

                continue;
            }

            if (type === 'date') {
                data[key] = element.value || null;
                continue;
            }

            const value = element.value.trim();

            data[key] = value === '' &&
                ['github_url', 'linkedin_url', 'website_url',
                 'credential_url', 'live_demo_url'].includes(key)
                ? null
                : value;
        }

        // Prevent the old Projects description NULL error.
        if (section === 'projects') {
            data.description = data.description || '';
            data.title = data.title || '';

            if (!data.slug) {
                data.slug = data.title
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-|-$/g, '');
            }
        }

        // Ensure mandatory text columns are never null.
        if (section === 'certificates') {
            data.issuer = data.issuer || '';
            data.description = data.description || '';
        }

        if (section === 'resumes') {
            data.role = data.role || '';
            data.description = data.description || '';
        }

        if (section === 'education') {
            data.description = data.description || '';
        }

        if (section === 'experience') {
            data.description = data.description || '';
        }

        if (section === 'profile') {
            data.short_intro = data.short_intro || '';
            data.about_text = data.about_text || '';
            data.current_focus = data.current_focus || '';
            data.career_objective = data.career_objective || '';
        }

        if (section === 'contact') {
            data.availability_text = data.availability_text || '';
        }

        return data;
    }

    // ==========================================
    // SAVE RECORD
    // ==========================================

    async function saveRecord(event) {
        event.preventDefault();

        msg('Saving...');

        const cfg = config[section];

        try {
            const data = await collectFormData(cfg);

            let query;

            if (editing) {
                // Use the actual UUID, never true.
                query = client
                    .from(cfg.table)
                    .update(data)
                    .eq('id', editing.id);
            } else {
                // Let PostgreSQL generate the UUID.
                query = client
                    .from(cfg.table)
                    .insert(data);
            }

            const { error } = await query;

            if (error) throw error;

            $('editor').classList.add('hidden');
            editing = null;

            msg('Saved successfully.');

            await load();

        } catch (error) {
            console.error('Save error:', error);
            msg(error.message || 'Could not save record.', true);
        }
    }

    // ==========================================
    // RECORD CARD
    // ==========================================

    function card(record) {
        const title = getTitle(record);

        const subtitle =
            record.status ||
            record.institution ||
            record.job_title ||
            record.professional_title ||
            record.phone ||
            '';

        return `
            <article class="record">

                <div class="file-icon">✦</div>

                <div>
                    <h3>${esc(title)}</h3>
                    <p>${esc(subtitle)}</p>

                    ${record.status ? `
                        <span class="status ${record.status === 'draft' ? 'draft' : ''}">
                            ${esc(record.status)}
                        </span>
                    ` : ''}
                </div>

                <div class="record-actions">
                    <button class="btn secondary"
                        data-edit="${esc(record.id)}">
                        Edit
                    </button>

                    ${!config[section].single ? `
                        <button class="btn danger"
                            data-delete="${esc(record.id)}">
                            Delete
                        </button>
                    ` : ''}
                </div>

            </article>
        `;
    }

    // ==========================================
    // CONTACT MESSAGE INBOX
    // ==========================================

    async function loadMessages() {
        msg('Loading messages...');

        $('messagesBtn').textContent = 'Back to contact details';
        $('messagesBtn').classList.remove('hidden');
        $('messagesBtn').onclick = load;

        $('addBtn').classList.add('hidden');

        $('listTitle').textContent = 'Visitor Messages';
        $('listHint').textContent =
            'Only authorized administrators can read these messages.';

        const { data, error } = await client
            .from('contact_messages')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            msg(error.message, true);
            return;
        }

        $('records').innerHTML = data.length
            ? data.map(message => `
                <article class="record message-record">

                    <div>
                        <h3>
                            ${esc(message.subject || 'No subject')}
                        </h3>

                        <p>
                            ${esc(message.name)} ·
                            ${esc(message.email)}
                        </p>

                        <p>${esc(message.message)}</p>

                        <small>
                            ${new Date(message.created_at).toLocaleString()}
                        </small>

                        <p>
                            ${message.is_read ? 'Read' : 'Unread'}
                        </p>
                    </div>

                    <div class="record-actions">
                        <button class="btn secondary"
                            data-message-status="${message.id}"
                            data-next="${!message.is_read}">
                            Mark ${message.is_read ? 'unread' : 'read'}
                        </button>

                        <button class="btn danger"
                            data-message-delete="${message.id}">
                            Delete
                        </button>
                    </div>

                </article>
            `).join('')
            : '<div class="empty">No messages received.</div>';

        document.querySelectorAll('[data-message-status]')
            .forEach(button => {
                button.onclick = async () => {
                    const { error } = await client
                        .from('contact_messages')
                        .update({
                            is_read: button.dataset.next === 'true'
                        })
                        .eq('id', button.dataset.messageStatus);

                    if (error) {
                        msg(error.message, true);
                    } else {
                        await loadMessages();
                    }
                };
            });

        document.querySelectorAll('[data-message-delete]')
            .forEach(button => {
                button.onclick = async () => {
                    if (!confirm('Delete this message?')) return;

                    const { error } = await client
                        .from('contact_messages')
                        .delete()
                        .eq('id', button.dataset.messageDelete);

                    if (error) {
                        msg(error.message, true);
                    } else {
                        msg('Message deleted.');
                        await loadMessages();
                    }
                };
            });

        msg('Messages loaded.');
    }

    // ==========================================
    // LOAD SECTION
    // ==========================================

    async function load() {
        const cfg = config[section];

        if (!cfg) return;

        $('pageTitle').textContent = cfg.title;

        $('listTitle').textContent =
            cfg.single ? cfg.title : `All ${cfg.title}`;

        $('listHint').textContent = cfg.hint;

        $('addBtn').classList.remove('hidden');

        $('addBtn').textContent = cfg.single
            ? '＋ Edit details'
            : `＋ Add ${cfg.title}`;

        $('addBtn').onclick = () => {
            openEditor(null);
        };

        if (section === 'contact') {
            $('messagesBtn').classList.remove('hidden');
            $('messagesBtn').textContent = 'View message inbox';
            $('messagesBtn').onclick = loadMessages;
        } else {
            $('messagesBtn').classList.add('hidden');
        }

        $('editor').classList.add('hidden');

        msg('Loading...');

        let query = client
            .from(cfg.table)
            .select('*');

        if (cfg.single) {
            query = query
                .order('created_at', { ascending: true })
                .limit(1);
        } else {
            query = query.order('created_at', {
                ascending: false
            });
        }

        const { data, error } = await query;

        if (error) {
            console.error('Load error:', error);
            msg(error.message, true);
            $('records').innerHTML = '';
            return;
        }

        $('records').innerHTML = data?.length
            ? data.map(card).join('')
            : `
                <div class="empty">
                    ${cfg.single
                        ? 'No details yet. Add them now.'
                        : 'No records yet. Add your first one.'}
                </div>
            `;

        // Edit buttons
        $('records').querySelectorAll('[data-edit]')
            .forEach(button => {
                button.onclick = () => {
                    const record = data.find(
                        item => String(item.id) === button.dataset.edit
                    );

                    if (record) openEditor(record);
                };
            });

        // Delete buttons
        $('records').querySelectorAll('[data-delete]')
            .forEach(button => {
                button.onclick = () => remove(button.dataset.delete);
            });

        // Single-record sections
        if (cfg.single && data?.length) {
            openEditor(data[0]);
        }

        if ($('stats')) {
            $('stats').innerHTML = '';
        }

        msg('Loaded successfully.');
    }

    // ==========================================
    // DELETE RECORD
    // ==========================================

    async function remove(id) {
        if (!id) return;

        if (!confirm('Delete this record? This cannot be undone.')) {
            return;
        }

        const { error } = await client
            .from(config[section].table)
            .delete()
            .eq('id', id);

        if (error) {
            msg(error.message, true);
        } else {
            msg('Deleted successfully.');
            await load();
        }
    }

    // ==========================================
    // AUTHENTICATION
    // ==========================================

    async function showApp(user) {
        $('authView').classList.add('hidden');
        $('appView').classList.remove('hidden');

        const { data, error } = await client
            .from('admin_users')
            .select('user_id')
            .eq('user_id', user.id)
            .maybeSingle();

        if (error || !data) {
            await client.auth.signOut();

            $('appView').classList.add('hidden');
            $('authView').classList.remove('hidden');

            $('authMessage').textContent =
                'This account is not authorized as an admin.';

            return;
        }

        await load();
    }

    $('loginForm').onsubmit = async event => {
        event.preventDefault();

        $('authMessage').textContent = 'Signing in...';

        const { data, error } = await client.auth
            .signInWithPassword({
                email: $('email').value,
                password: $('password').value
            });

        if (error) {
            $('authMessage').textContent = error.message;
            return;
        }

        await showApp(data.user);
    };

    $('logoutBtn').onclick = async () => {
        await client.auth.signOut();
        location.reload();
    };

    // ==========================================
    // SIDEBAR NAVIGATION
    // ==========================================

    document.querySelectorAll('[data-section]')
        .forEach(button => {
            button.onclick = async () => {
                const nextSection = button.dataset.section;

                if (!config[nextSection]) {
                    msg('Unknown section.', true);
                    return;
                }

                section = nextSection;
                editing = null;

                document.querySelectorAll('[data-section]')
                    .forEach(item => {
                        item.classList.toggle(
                            'active',
                            item === button
                        );
                    });

                $('editor').classList.add('hidden');
                $('records').innerHTML = '';

                await load();
            };
        });

    // ==========================================
    // INITIALIZE
    // ==========================================

    (async () => {
        try {
            const { data, error } = await client.auth.getSession();

            if (error) throw error;

            if (data.session) {
                await showApp(data.session.user);
            }
        } catch (error) {
            console.error('Initialization error:', error);
            msg(error.message, true);
        }
    })();

})();
