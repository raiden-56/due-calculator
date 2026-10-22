import { Box, Breadcrumbs, Link, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';

interface Crumb {
  label: string;
  to?: string;
}

interface Props {
  title: string;
  subtitle?: ReactNode;
  crumbs?: Crumb[];
  actions?: ReactNode;
}

export default function PageHeader({ title, subtitle, crumbs, actions }: Props) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'stretch', sm: 'flex-end' },
        justifyContent: 'space-between',
        gap: 1.5,
        mb: { xs: 2, md: 3 },
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        {crumbs && crumbs.length > 0 && (
          <Breadcrumbs sx={{ mb: 0.5, '& .MuiBreadcrumbs-separator': { mx: 0.75 } }}>
            {crumbs.map((c, i) =>
              c.to ? (
                <Link key={i} component={RouterLink} to={c.to} underline="hover" color="text.secondary" variant="caption">
                  {c.label}
                </Link>
              ) : (
                <Typography key={i} variant="caption" color="text.primary">
                  {c.label}
                </Typography>
              ),
            )}
          </Breadcrumbs>
        )}
        <Typography variant="h5" sx={{ fontSize: { xs: '1.35rem', md: '1.6rem' } }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {actions && (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', '& > *': { flexGrow: { xs: 1, sm: 0 } } }}>{actions}</Box>
      )}
    </Box>
  );
}
