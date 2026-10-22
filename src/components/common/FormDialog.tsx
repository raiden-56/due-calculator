import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { X } from 'lucide-react';
import type { FormEvent, ReactNode } from 'react';

interface Props {
  open: boolean;
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  onClose: () => void;
  onSubmit: () => void;
  submitLabel?: string;
  submitDisabled?: boolean;
  maxWidth?: 'xs' | 'sm' | 'md';
  extraActions?: ReactNode;
}

/** Responsive dialog: full-screen on phones, centered card on larger screens. */
export default function FormDialog({
  open,
  title,
  subtitle,
  children,
  onClose,
  onSubmit,
  submitLabel = 'Save',
  submitDisabled,
  maxWidth = 'sm',
  extraActions,
}: Props) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <Dialog open={open} onClose={onClose} fullScreen={fullScreen} maxWidth={maxWidth} fullWidth>
      <Box component="form" onSubmit={handleSubmit} noValidate sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1.5 }}>
          <Box sx={{ minWidth: 0 }}>
            <Box sx={{ fontWeight: 700 }}>{title}</Box>
            {subtitle && <Box sx={{ fontSize: 13, color: 'text.secondary', fontWeight: 400 }}>{subtitle}</Box>}
          </Box>
          <IconButton onClick={onClose} aria-label="close" size="small">
            <X size={18} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2.5 }}>
          {children}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, gap: 1, flexWrap: 'wrap' }}>
          {extraActions}
          <Box sx={{ flex: 1 }} />
          <Button onClick={onClose} color="inherit">
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={submitDisabled}>
            {submitLabel}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
